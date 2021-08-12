
const Tables = require('./tables')

// Common button color definitions amongst all files
const LightBlue = ' style="background-color:#33C3F0;color:#FFF" '
const DarkBlue = ' style="background-color:#3365f0;color:#FFF" '

// Global variables
var MainWindow

exports.start = function(win, functions) {

  MainWindow = win
  // show main screen of tool 3
  Tables.showResults(['not implemented'])
}

exports.passTo = function(str) {

  // handle button clicks
}
