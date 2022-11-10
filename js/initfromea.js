
const { access } = require('original-fs');
const Tables = require('./tables')

// Common button color definitions amongst all files
const LightBlue = ' style="background-color:#33C3F0;color:#FFF" '
const DarkBlue = ' style="background-color:#3365f0;color:#FFF" '

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

function showMainScreen() {
  var tableBody = "";
  Tables.clearResults();

  tableBody += '<tr><td>'
  tableBody += '<input type="text" class="twelve columns" placeholder="Enter emails for access list (comma separated)" id="access">'
  tableBody += '</td></tr>'
  tableBody += '<tr><td><input type="button" class="three columns" value="Submit"' + LightBlue + 'onclick="passToInitFromEA(\'submit\')"></td></tr>'

  // Fill the table content
  Tables.showMain(tableBody);
}

exports.passTo = function(str) {
  // handle button presses
  if (str === "submit") {
    submit();
  }
};

function submit() {
  prepDocuments(EventInfo.id.toString())
    .then((documents) => {
      submitEventInit("eventInitialize", documents.download);
      submitEventInit("eventInitializeAccess", documents.access);
    }).catch((error) => {
      Tables.showResults("process error: " + error);
    });
}

async function prepDocuments(eventId) {
  let eventInfoPromise = getEventInfo(eventId);
  let peoplePromise = getPeople(eventId);

  let download = {
    contacts: await peoplePromise,
    event_info: await eventInfoPromise
  };

  let access = {
    members: getAccessList(),
    event_info: await eventInfoPromise
  };

  let docs = {
    download: download,
    access: access
  };

  return docs;

}

async function getEventInfo(eventId) {
  let eventInfo = await Rest.get(ApiKey, "/v4/events/"+eventId);
  let abrigedEventInfo = {
    event_id: eventId,
    event_name: eventInfo.name,
    start_time: eventInfo.startDate,
    end_time: eventInfo.endDate
  };
  return abrigedEventInfo;
}

async function getPeople(eventId) {
  let signups = await Rest.get(ApiKey, "/v4/signups?eventId="+eventId);

  console.log(signups);
  let vanIds = [];
  for (let i=0; i < signups.items.length; i++) {
    vanIds.push(signups.items[i].person.vanId);
  }
  return await Promise.all(vanIds.map(getSinglePerson));
}

async function getSinglePerson(vanId) {
  let person = await Rest.get(ApiKey, "/v4/people/" + vanId + "?$expand=phones%2Cemails")

  let cellPhone = "";
  let homePhone = "";

  // iterate in reverse so we end with the first phone a given type
  for (let i = person.phones.length - 1; i >= 0; i--) {
    if (person.phones[i].phoneType == "Cell") {
      cellPhone = person.phones[i].phoneNumber;
    } else if (person.phones[i].phoneType == "Home") {
      homePhone = person.phones[i].phoneNumber;
    }
  }

  let emailAddresses = [];
  for (let i = 0; i < person.emails.length; i++) {
    emailAddresses.push(person.emails[i].email);
  }

  return {
    van_id: vanId,
    first: person.firstName,
    last: person.lastName,
    home: homePhone,
    cell: cellPhone,
    emails: emailAddresses,
  };
}

function getAccessList() {
  let emailsStr = Tables.getInputString("access", "No emails for access list");
  let emails = emailsStr.split(",");
  for (let i = 0; i < emails.length; i++) {
    emails[i] = emails[i].trim();
  }
  return emails;
}

function submitEventInit(funcName, doc) {
  let fireFunction = Functions.httpsCallable(funcName);
  fireFunction(doc)
    .then((result) => {
      // Read result of the Cloud Function.
      Tables.showResults([result.data]);
    })
    .catch((error) => {
      // Getting the Error details.
      let message = error.message;
      Tables.showResults(["Initialize error: ", message]);
    });
}
