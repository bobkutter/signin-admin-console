// Required for side-effects
require("firebase/functions");

const Fbase = require("./js/fbase");
const Tables = require("./js/tables");
const Rest = require("./js/rest");
const InitByFile = require("./js/initbyfile");
const InitFromEA = require("./js/initfromea");
const EventRetrieve = require("./js/retrieve");

// Common button color definitions amongst all files
const LightBlue = " style=\"background-color:#33C3F0;color:#FFF\" ";
const DarkBlue = " style=\"background-color:#3365f0;color:#FFF\" ";
const ErrorRow = " style=\"background-color:#e32636;color:#000\" ";
const WarnRow = " style=\"background-color:#ffbf00;color:#000\" ";
const OkayRow = " style=\"background-color:#5f9ea0;color:#000\" ";

// global variables
let ThisWindow;
let Functions;
let ApiKey;
let EventInfo = {};

window.onload = function() {
  ThisWindow = window;

  // Initialize Cloud Functions through Firebase
  Functions = Fbase.initialize();

  showIntroScreen();
};

function showIntroScreen() {
  Tables.clearResults();

  let tableBody = "";
  tableBody += "<tr><td>";
  tableBody += "<input type=\"text\" class=\"ten columns\""+
      " placeholder=\"Enter EveryAction API Key\" id=\"apikey\">";
  tableBody += "</td></tr>";
  tableBody += "<tr><td>";
  tableBody += "<input type=\"text\" class=\"ten columns\""+
      " placeholder=\"Enter EveryAction Event ID\" id=\"eventId\">";
  tableBody += "</td></tr>";
  tableBody += "<tr><td><input type=\"button\" class=\"three columns\""+
      " value=\"Start\"" + LightBlue + "onclick=\"start()\"></td></tr>";

  // Fill the table content
  Tables.showMain(tableBody);

  document.getElementById("apikey").focus();
}

function start() {
  ApiKey = getInputValue("apikey", "No API Key specified");
  let eventId = getInputValue("eventId", "No Event ID specified");
  if (ApiKey === "" || eventId === "") {
    return;
  }

  getEveryActionEvent(eventId);
}

function getInputValue(id, errStr) {
  let handle = document.getElementById(id);
  if (handle.value === "") {
    Tables.showResults(errStr);
  }
  return handle.value;
}

function showSelectionButtons(selectedButton) {
  Tables.showMain("");
  Tables.clearResults();
  let updateColor = (selectedButton === "initByFile" ? DarkBlue : LightBlue);
  let changePwdColor = (selectedButton === "retrieve" ? DarkBlue : LightBlue);
  let settingsColor = (selectedButton === "initFromEA" ? DarkBlue : LightBlue);

  // Would use the package version directly but that isn't
  // available in the installed product. So if the package
  // version is defined that we means we're in development
  // so alert the developer if hardcoded version does not
  // match package version.
  let hardVersion = "1.0.0";
  let pkgVersion = process.env.npm_package_version;
  if (pkgVersion !== "undefined") {
    if (hardVersion !== pkgVersion) {
      alert("Hardcoded version should be "+pkgVersion);
    }
  }

  let tableBody = "<tr><p style=\"text-align:center\">"+hardVersion+"</p></tr>";
  tableBody += "<tr><td>";
  tableBody += "<input type=\"button\" class=\"four columns\""+
      " value=\"Initialize From File\"" +
      updateColor + "onclick=\"initByFile()\">";
  tableBody += "<input type=\"button\" class=\"four columns\""+
      " value=\"Initialize From Event\"" +
      settingsColor + "onclick=\"initFromEA()\">";
  tableBody += "<input type=\"button\" class=\"four columns\""+
      " value=\"Retrieve\"" + changePwdColor + "onclick=\"eventRetrieve()\">";
  tableBody += "</td></tr>";

  // Fill the table content
  Tables.showSelections(tableBody);
}

function initByFile() {
  showSelectionButtons("initByFile");
  InitByFile.start(ThisWindow, Functions, EventInfo);
}

function passToInitByFile(str) {
  InitByFile.passTo(str);
}

function eventRetrieve() {
  showSelectionButtons("retrieve");
  EventRetrieve.start(ThisWindow, Functions, ApiKey, EventInfo);
}

function passToEventRetrieve(str) {
  EventRetrieve.passTo(str);
}

function initFromEA() {
  showSelectionButtons("initFromEA");
  InitFromEA.start(ThisWindow, Functions, ApiKey, EventInfo);
}

function passToInitFromEA(str) {
  InitFromEA.passTo(str);
}

function getEveryActionEvent(eventId) {
  console.log("requesting event "+eventId);
  Rest.get(ApiKey, "/v4/events/"+eventId+"?$expand=shifts")
  .then(
    (event) => {
      if (getEveryActionEventDetails(eventId, event)) {
        Tables.showMain("");
        showSelectionButtons("");
      }
    },
    (error) => {
      Tables.showResults("Failed to get Event from Event ID: "+error);
    }
  );
}

function getEveryActionEventDetails(eventId, event) {
  EventInfo.id = eventId;
  EventInfo.name = event.name;
  Tables.setTitle(EventInfo.name);

  EventInfo.startDate = event.startDate;
  EventInfo.endDate = event.endDate;
  console.log("got event dates: "+EventInfo.startDate+" "+EventInfo.endDate);

  if (event.shifts !== "undefined" && event.shifts.length > 0) {
    EventInfo.shift = event.shifts[0].eventShiftId;
    console.log("got event shift: "+EventInfo.shift);
    return true;
  }
  else {
    Tables.showResults("Could not locate event Shift.");
    return false;
  }
}
