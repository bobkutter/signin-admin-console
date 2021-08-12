var Https = require("https");

exports.get = function(username, path) {
  const len = username.length;

  console.log("get "+path);
  return new Promise(function(resolve, reject) {

    var options = {
      "host": "api.securevan.com",
      "path": path,
      "headers": {
        "Accept": "application/json",
        "Authorization": "Basic " +
        new Buffer.alloc(len, username).toString("base64")
      }
    };
    Https.get(options, function (res) {
      var json = "";
      var data;
      var retval;

      res.on("data", function (chunk) {
          json += chunk;
      });

      res.on("end", function () {
        if (res.statusCode === 200) {
          try {
            data = JSON.parse(json);
            // data is available here:
            resolve(data);
          } catch (e) {
            console.log("Error parsing JSON!");
            reject(e);
          }
        } else {
          console.log("Status:"+res.statusCode);
          retval = (res.statusCode === 404 ? "not found" : res.statusCode);
          reject(retval);
        }
      });
    }).on("error", function (err) {
        console.log("Error:", err);
        reject("Error:"+err);
    });
  });
};
