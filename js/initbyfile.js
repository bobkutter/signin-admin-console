// Required for side-effects
require("firebase/functions");
const XLSX = require("xlsx");
const Zlib = require("zlib");
const Tables = require("./tables");

// Common button color definitions amongst all files
const LightBlue = " style=\"background-color:#33C3F0;color:#FFF\" ";
const DarkBlue = " style=\"background-color:#3365f0;color:#FFF\" ";

// Global variables
let MainWindow;
let Functions;
let EventInfo;

exports.start = function(win, functions, eventInfo) {

  MainWindow = win;
  Functions = functions;
  EventInfo = eventInfo;

  // show main screen
  showMainScreen("");
};

exports.passTo = function(str) {
  // handle button clicks
  if (str === "handleFileOpen") {
    handleFileOpen();
  } else if (str === "submit") {
    submit();
  }
};

function showMainScreen(fileName) {
  Tables.clearResults();

  if (fileName === "") {
    fileName = getInputString("stdTxtFile","");
  }

  let tableBody = ''
  tableBody += '<tr><td>'
  tableBody += '<input type="button" class="two columns" value="Open"' + LightBlue + 'onclick="passToInitByFile(\'handleFileOpen\')">'
  tableBody += '<input type="text" class="ten columns" value="'+fileName+'" placeholder="Click Open to select Standard Text file" id="stdTxtFile">'
  tableBody += '</td></tr>'
  tableBody += '<tr><td>'
  tableBody += '<input type="text" class="twelve columns" placeholder="Enter emails for access list (comma separated)" id="access">'
  tableBody += '</td></tr>'
  tableBody += '<tr><td><input type="button" class="three columns" value="Submit"' + LightBlue + 'onclick="passToInitByFile(\'submit\')"></td></tr>'

  // Fill the table content
  Tables.showMain(tableBody);

  document.getElementById("stdTxtFile").focus();
}

function handleFileOpen() {
  Tables.clearResults();
  Tables.clearDetails();

  // Use system dialog to select file name
  const { dialog } = require("electron").remote;
  promise = dialog.showOpenDialog();
  promise.then(
    (result) => handleFileOpenResult(result.filePaths[0]),
    (error) => alert(error)
  );
}

function handleFileOpenResult(fileName) {
  if (fileName === "undefined") {
    return;
  }
  showMainScreen(fileName);
}

function submit() {
  let fileName = getInputString("stdTxtFile","No Standard Text file selected");
  let emails = getInputString("access", "No emails for access list");
  if (fileName === "" || emails === "") {
    return;
  }

  let downloadDoc = {};
  if (parseStandardTextFile(fileName, downloadDoc) == false) {
    return;
  }
  addEventInfo(downloadDoc);
  submitEventInit("eventInitialize", downloadDoc);

  let accessDoc = {};
  parseAccessList(emails, accessDoc);
  addEventInfo(accessDoc);
  submitEventInit("eventInitializeAccess", accessDoc);
}

function parseStandardTextFile(fileName, doc) {
  let sheet = [];
  try {
    let workbook = XLSX.readFile(fileName);

    // EveryAction export file only has one sheet
    let sheetName = workbook.SheetNames[0];
    let xlsxSheet = workbook.Sheets[sheetName];
    sheet = XLSX.utils.sheet_to_json(xlsxSheet,{defval:""});
  } catch (e) {
    Tables.showResults([e.message]);
    return false;
  }

  let contacts = [];
  for (let i = 0; i < sheet.length; i+=1) {
    let row = sheet[i];
    let contact = {};
    contact.van_id = row.VANID.toString();
    contact.last = row.Last;
    contact.first = row.First;
    contact.home = row["Home Phone"].toString();
    contact.cell = row["Cell Phone"].toString();
    contact.emails = [];
    contact.emails.push(row.PreferredEmail);
    contacts.push(contact);
  }
  doc.contacts = contacts;

  let contactsStr = JSON.stringify(contacts);
  let compressedStr = Zlib.deflateSync(contactsStr);
  let buff = Buffer.from(compressedStr, "utf-8");
  let encodedStr = buff.toString("base64");
  doc.compressed_contacts = encodedStr;

  return true;
}

function addEventInfo(doc) {
  let info = {};
  info.event_id = EventInfo.id;
  info.event_name = EventInfo.name;
  info.start_time = EventInfo.startDate;
  info.end_time = EventInfo.endDate;
  doc.event_info = info;
}

function parseAccessList(emailsStr, accessDoc) {
  let members = [];
  let emails = emailsStr.split(",");
  for (let i = 0; i < emails.length; i+=1) {
    members.push(emails[i]);
  }
  accessDoc.members = members;
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

function getInputString(elemId, errString) {
  console.log("getting "+elemId);
  let handle = document.getElementById(elemId);
  if (handle === null || handle.value === "") {
    Tables.showResults([errString]);
    return "";
  }
  console.log("got "+elemId+" "+handle.value);
  return handle.value;
}
