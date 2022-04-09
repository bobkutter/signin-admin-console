let Details =  [];

exports.setTitle = function(title) {
  document.getElementById("title").innerHTML = title;
};

exports.showSelections = function(str) {
  document.getElementById("table-selections").innerHTML = str;
};

exports.showMain = function(str) {
  document.getElementById("table-main").innerHTML = str;
};

// Populates the results table
exports.showResults = function(str) {
  // Generate the table body
  document.getElementById("table-main-results").innerHTML = str;
};

// clears the results table
exports.clearResults = function() {
  // clear the table content
  document.getElementById("table-main-results").innerHTML = "";

  // if we"re clearing the results, let"s clear details too
  Details = [];
  document.getElementById("table-details").innerHTML = "";
};

exports.addDetails = function(titleColor, str) {
  Details.push("<tr "+titleColor+"><td>"+str+"</td></tr>");
};

exports.clearDetails = function() {
  Details = [];
  document.getElementById("table-details").innerHTML = "";
};

exports.showDetails = function(deets) {
  let tableBody = "";
  if (deets.length == 0) {
    // Use accumulated details
    for (let i = 0; i < Details.length; i++) {
      tableBody += Details[i];
    }
  } else {
    // User details passed in
    tableBody = "";
    for (let i = 0; i < deets.length; i++) {
      tableBody += deets[i];
    }
  }

  // Fill the table content
  document.getElementById("table-details").innerHTML = tableBody;
};
