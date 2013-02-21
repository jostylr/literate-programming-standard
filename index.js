/*global module, require*/
module.exports = {
  'js': function (doc) {
    var beautify = require('js-beautify').js_beautify;
    var jshint = require('jshint').JSHINT;

    doc.addTypes({
      js: "text/javascript",
      json: "application/json"
    });

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
        console.log("tidying");
        return beautify(code, options);
      }

      ,
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
          doc.log("!! JSHint:" + this.fullname + "\n" + log.join("\n"));
        } else {
          doc.log("JSHint CLEAN: " + this.fullname);
        }

        return code;
      }
    });
  },
  'md': function (doc) {
    var marked = require('marked');

    doc.addTypes({
      md: "text/x-markdown"
    });

    doc.addCommands({
      marked: function (code) {

        var lpsnip = [],
          mathsnip = [];

        var masklit = function (match) {
          lpsnip.push(match);
          return "<!--LITPROSNIP" + (lpsnip.length - 1) + "-->";
        };

        var maskmath = function (match) {
          mathsnip.push(match);
          return "<!--MATHSNIP" + (mathsnip.length - 1) + "-->";
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
        code = code.replace(/<\!\-\-LITPROSNIP(\d+)\-\->/g, unmasklit);
        code = code.replace(/<\!\-\-MATHSNIP(\d+)\-\->/g, unmaskmath);

        return code;

      }

    });
  },
  'html': function (doc) {

    doc.addTypes({
      html: "text/html"
    });

    doc.addCommands({
      "escape": function (code) {
        code = code.replace(/</g, "&lt;");
        code = code.replace(/>/g, "&gt;");
        code = code.replace(/\&/g, "&amp;");
        return code;
      },
      "unescape": function (code) {
        code = code.replace(/\&lt\;/g, "<");
        code = code.replace(/\&gt\;/g, ">");
        code = code.replace(/\&amp\;/g, "&");
        return code;
      },
      "wrap": function (code, options) {

        var element = options.shift();

        var i, option, attributes = [],
          klass = [];

        for (i = 0; i < options.length; i += 1) {
          option = options[i];
          if (option.indexOf("=") !== -1) {
            attributes.push(option);
          } else { // class
            klass.push(option.trim());
          }
        }
        if (klass.length > 0) {
          attributes.push("class='" + klass.join(" ") + "'");
        }
        attributes = attributes.join(" ");


        return "<" + element + " " + attributes + ">" + code + "</" + element + ">";

      },
      "htmltable": function (code, options) {
        var type = options.shift();

        var matrix = this.state.obj || [
          []
        ];

        var i, option, attributes = [],
          klass = [];

        for (i = 0; i < options.length; i += 1) {
          option = options[i];
          if (option.indexOf("=") !== -1) {
            attributes.push(option);
          } else { // class
            klass.push(option.trim());
          }
        }
        if (klass.length > 0) {
          attributes.push("class='" + klass.join(" ") + "'");
        }
        attributes = attributes.join(" ");


        var ret = "<table " + attributes + ">";

        var n = matrix.length,
          row;

        if (type === "rowswheader") {
          row = matrix[0];
          ret += "<tr><th>" + row.join("</th><th>") + "</th></tr>";


          for (i = 1; i < n; i += 1) {
            row = matrix[i];
            ret += "<tr><td>" + row.join("</td><td>") + "</td></tr>";

          }
        } else { //if (type === "rows" ) {
          for (i = 0; i < n; i += 1) {
            row = matrix[i];
            ret += "<tr><td>" + row.join("</td><td>") + "</td></tr>";

          }
        }
        ret += "</table>";
        return ret;
      }
    });

    doc.addConstants({
      "mathjax": ["<script type=\"text/x-mathjax-config\">",
        "",
        "MathJax.Hub.Config({",
        "    extensions: [\"tex2jax.js\"],",
        "    jax: [\"input/TeX\", \"output/HTML-CSS\"],",
        "    tex2jax: {",
        "      inlineMath: [ ['$','$'], [\"\\\\(\",\"\\\\)\"] ],",
        "      displayMath: [ ['$$','$$'], [\"\\\\[\",\"\\\\]\"] ],",
        "      processEscapes: true",
        "    },",
        "    \"HTML-CSS\": { availableFonts: [\"TeX\"] }, ",
        "    TeX: {",
        "    Macros: {",
        "      R: '{\\\\mathbb{R}}',",
        "      C: '{\\\\mathbb{C}}'    }",
        "    }",
        "});",
        "",
        "</script>",
        "<script type=\"text/javascript\"",
        "  src=\"http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML\">",
        "</script>"].join("\n")
    });

    doc.addMacros({
      "jquery": function (v) {
        return '<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/' + (v || '1.9.0') + '/jquery.min.js"></script>';
      }

    });

  },
  'css': function (doc) {

    doc.addMacros({
      "bootswatch": function (bs) {
        return '<link rel="stylesheet" href="http://bootswatch.com/' + (bs || 'journal') + '/bootstrap.min.css">';
      }

    });

  }
};