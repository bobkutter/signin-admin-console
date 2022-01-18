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

// retrieve.then (inherently async)
// process.then (def async)
// show (has a button)
// save (triggered from button)

async function processResults(resultsStr) {
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

  // Create a single array of check-ins with the agent as "Contacted by"
  let checkinData = [];
  for (let i = 0; i < agents.length; i++) {
    let agent = agents[i];
    let checkins = agent.checked_in;
    for (let j = 0; j < checkins.length; j++) {
      let vanId = checkins[j];
      let checkin = { "VANID": vanId, "ContactedBy": agent.agent };
      checkinData.push(checkin);
    }
  }

  checkinPromises = checkinData.map(singleCheckIn);
  checkinTableRows = await Promise.all(checkinPromises);
  checkinTableHeader = [["VANID", "Last", "First", "Contacted By"]]
  checkinTable = checkinTableHeader.concat(checkinTableRows)

  FS.writeFileSync(dataDir+"/new_contacts.csv", tableToCSV(newContactsTable), "utf-8");
  FS.writeFileSync(dataDir+"/check_ins.csv", tableToCSV(checkinTable), "utf-8");
}


async function singleCheckIn(checkin) {
  let vanId = checkin.VANID;
  let contactedBy = checkin.ContactedBy;

  let person = await Rest.get(ApiKey, "/v4/people/"+vanId);

  return [vanId, person.lastName, person.firstName, contactedBy];
}


function showDownloadedTables() {
  var tableBody = "";
  Tables.clearResults();

  tableBody += '<tr><td><input type="button" class="three columns" value="Save Tables"' + LightBlue + 'onclick="passToEventRetrieve(\'saveTables\')"></td></tr>'

  Tables.showMain(tableBody);
}


function tableToCSV(table) {
  let csvStr = "";
  for (let i = 0; i < table.length; i++) {
    csvStr += table[i].join(",");
    csvStr += "\n";
  }
  return csvStr;
}