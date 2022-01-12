const OS = require("os");
const FS = require("fs");
const Tables = require("./tables");

// Common button color definitions amongst all files
const LightBlue = " style=\"background-color:#33C3F0;color:#FFF\" ";
const DarkBlue = " style=\"background-color:#3365f0;color:#FFF\" ";

// Global variables
var MainWindow;
var Functions;
var ApiKey;
var EventInfo;

exports.start = function(win, functions, apiKey, eventInfo) {
  MainWindow = win;
  Functions = functions;
  ApiKey = apiKey;
  EventInfo = eventInfo;

  showMainScreen();
};

exports.passTo = function(str) {
  if (str === "submit") {
    submit();
  }
};

function showMainScreen() {
  var tableBody = "";
  Tables.clearResults();

  tableBody += '<tr><td><input type="button" class="three columns" value="Submit"' + LightBlue + 'onclick="passToEventRetrieve(\'submit\')"></td></tr>'

  // Fill the table content
  Tables.showMain(tableBody);
}

function submit() {
  var retrieve = Functions.httpsCallable("eventRetrieve");
  retrieve({ event_id: EventInfo.id.toString() })
  .then((result) => {
    // Read result of the Cloud Function.
    processResults(result.data);
  })
  .catch((error) => {
    // Getting the Error details.
    var message = error.message;
    Tables.showResults(["retrieve error: ", message]);
  });
  showDownloadedTables()
}

function showDownloadedTables() {
  var tableBody = "";
  Tables.clearResults();

  tableBody += '<tr><td>blargle</td></tr>'

  Tables.showMain(tableBody);
}

function processResults(resultsStr) {
  var results = JSON.parse(resultsStr);
  var dataDir = OS.homedir();

  // Process new contacts since all the information is in the json.
  let newContactsTable = [["Last", "First", "Email", "Home Phone", "Cell Phone", "Contacted by"]];
  var agents = results.agent_results;
  for (let i = 0; i < agents.length; i++) {
    let agent = agents[i];
    let newContacts = agent.new_contacts;
    for (let j = 0; j < newContacts.length; j++) {
      let newbie = JSON.parse(newContacts[j]);
      let newTableLine = [
        newbie.last.trim(),
        newbie.first.trim(),
        newbie.emails[0].trim(),
        typeof(newbie.home)=="undefined" ? "," : newbie.home,
        typeof(newbie.cell)=="undefined" ? "," : newbie.cell
      ];
      newContactsTable.push(newTableLine);
    }
  }

  var newContactsContents = tableToCSV(newContactsTable)
  FS.writeFileSync(dataDir+"/new_contacts.csv", newContactsContents, "utf-8");

  // Create a single array of check-ins with the agent as "Contacted by"
  let array = [];
  for (let i = 0; i < agents.length; i++) {
    let agent = agents[i];
    let checkins = agent.checked_in;
    for (let j = 0; j < checkins.length; j++) {
      let vanId = checkins[j];
      let checkin = { "VANID": vanId, "ContactedBy": agent.agent };
      array.push(checkin);
    }
  }

  // Call async function to go through each check-in and add first,Last
  let checkinTable = [["VANID", "Last", "First", "Contacted By"]];
  processCheckIn(array, 0, checkinTable);
}

function processCheckIn(array, index, checkinTable) {
  if (index >= array.length) {
    let dataDir = OS.homedir();
    let checkinContents = tableToCSV(checkinTable);
    FS.writeFileSync(dataDir+"/check_ins.csv", checkinContents, "utf-8");
    Tables.showResults(["check_ins.csv and new_contacts.csv are in "+dataDir]);
    return;
  }

  let checkin = array[index++];
  let vanId = checkin.VANID;
  let contactedBy = checkin.ContactedBy;
  Rest.get(ApiKey, "/v4/people/"+vanId)
  .then(
    person => {
      console.log("person "+person);
      let newTableLine = [
        vanId, 
        person.lastName,
        person.firstName,
        contactedBy
      ];
      checkinTable.push(newTableLine);
      processCheckIn(array, index, checkinTable);
    },
    error => {
      Tables.showResults([error]);
      return;
    }
  );
}

function tableToCSV(table) {
  let csvStr = "";
  for (let i = 0; i < table.length; i++) {
    console.log(table[i])
    csvStr += table[i].join(",");
    csvStr += "\n";
  }
  return csvStr;
}