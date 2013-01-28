/*global module, require*/
module.exports = {
  'js': function (doc) {
    var beautify = require('js-beautify').js_beautify;
    var jshint = require('jshint').JSHINT;

    doc.addCommands({
      jstidy: function (code, options) {
        options = options.join(",").trim();
        if (options) {
          options = JSON.parse(options);
        } else {
          options = {
            indent_size: 2,
            "jslint_happy": true
          };
        }
        return beautify(code, options);
      },
      jshint: function (code) {
        var doc = this.doc;
        var block = {}; //currently not stored anywhere

        jshint(code);
        var data = jshint.data();

        block.jshint = {
          data: data,
          errors: [],
          implieds: [],
          unused: []
        };
        var lines = code.split("\n");
        var log = [],
          err, i;
        for (i = 0; i < jshint.errors.length; i += 1) {
          err = jshint.errors[i];
          if (!err) {
            continue;
          }
          log.push("E " + err.line + "," + err.character + ": " + err.reason +
            "  " + lines[err.line - 1]);
          block.jshint.errors.push({
            "line#": err.line,
            character: err.character,
            reason: err.reason,
            line: lines[err.line - 1]
          });
        }
        if (data.hasOwnProperty("implieds")) {
          for (i = 0; i < data.implieds.length; i += 1) {
            err = data.implieds[i];
            log.push("Implied Gobal " + err.line + ": " + err.name +
              "  " + lines[err.line[0] - 1]);
            block.jshint.implieds.push({
              "line#": err.line,
              name: err.name,
              line: lines[err.line[0] - 1]
            });

          }
        }
        if (data.hasOwnProperty("unused")) {
          for (i = 0; i < data.unused.length; i += 1) {
            err = data.unused[i];
            log.push("Unused " + err.line + ": " + err.name +
              "  " + lines[err.line - 1]);
            block.jshint.unused.push({
              "line#": err.line,
              name: err.name,
              line: lines[err.line - 1]
            });

          }
        }

        if (log.length > 0) {
          doc.log("!! JSHint:" + this.block.name + "\n" + log.join("\n"));
        } else {
          doc.log("JSHint CLEAN: " + this.block.name);
        }

        return code;
      }
    });
  },
  'md': function (doc) {
    var marked = require('marked');

    doc.addTypes({});

    doc.addCommands({
      marked: function (code) {

        var lpsnip = [],
          mathsnip = [];

        var masklit = function (match) {
          lpsnip.push(match);
          return "LITPROSNIP" + (lpsnip.length - 1);
        };

        var maskmath = function (match) {
          mathsnip.push(match);
          return "MATHSNIP" + (mathsnip.length - 1);
        };

        var unmasklit = function (match, number) {
          return lpsnip[parseInt(number, 10)];
        };

        var unmaskmath = function (match, number) {
          return mathsnip[parseInt(number, 10)];
        };

        code = code.replace(/\_+(\"[^"]+\"|\`[^`]+\`)/g, masklit);
        code = code.replace(/\$\$[^$]+\$\$|\$[^$\n]+\$|\\\(((?:[^\\]|\\(?!\)))+)\\\)|\\\[((?:[^\\]|\\(?!\]))+)\\\]/g, maskmath);
        code = marked(code);
        code = code.replace(/LITPROSNIP(\d+)/g, unmasklit);
        code = code.replace(/MATHSNIP(\d+)/g, unmaskmath);
        return code;

      }
    });
  }
};