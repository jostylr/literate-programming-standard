# Standard plugins for literate programming

This is a standard library for literate programming. Originally it was part of literate programming, but to minimize the dependencies of the original, some of it was split off. 

This has the nice effect of forcing a standardized API for plugins and having an example for others to see. 

VERSION literate-programming-standard | 0.1.0

## Directory structure

Main entry point.

FILE index.js | basic setup || jshint |jstidy

FILE README.md | readme || clean raw

FILE package.json | npm package || jshint |jstidy


## Basic setup

Each type should be encapsulated into a function that takes in doc and does its work to modify. 

JS
    /*global module, require*/
    module.exports = {
        'js' : _"JavaScript",
        'md' : _"Markdown",
        'html' : _"HTML"
    };



## JavaScript

Here we add in the commands `jshint`, `jstidy`, and `jsmin`. 

JS
    
    function (doc) {
        var beautify = require('js-beautify').js_beautify;
        var jshint = require('jshint').JSHINT;

        doc.addTypes({
            js: "text/javascript", 
            json: "application/json" 
        });

        doc.addCommands({
            jstidy : _"jstidy",
            jshint : _"jshint"
        });
    }


### JSTidy

Run the compiled code through JSBeautify 

JS

    function (code, options) {
        options = options.join(",").trim();
        if (options) {
            options = JSON.parse(options);
        } else {
            options = { indent_size: 2, "jslint_happy": true };
        }
        return beautify(code, options);
    }
   
Needs js-beautify installed: `npm install js-beautify`

### JSHint

Run the compiled code through JSHint and output the results to console.

!! Need to think through options.

JS main

    function (code) {
        var doc = this.doc;
        var block = {};  //currently not stored anywhere

        jshint(code);
        var data = jshint.data();

        _"|jshint logging"


        if (log.length > 0 ) {
         doc.log ("!! JSHint:" + this.block.name+"\n"+log.join("\n"));
        } else {
         doc.log("JSHint CLEAN: " + this.block.name);
        }

        return code;
    }

Needs jshint installed: `npm install jshint`   

JS jshint logging

        block.jshint = {data:data, errors: [], implieds :[], unused :[]};
        var lines = code.split("\n");
        var log = [], err, i;
        for (i = 0; i < jshint.errors.length; i += 1) {
           err = jshint.errors[i];
           if (!err) {continue;}
           log.push("E "+ err.line+","+err.character+": "+err.reason +
            "  "+ lines[err.line-1]);
            block.jshint.errors.push({"line#": err.line, character: err.character, reason: err.reason, line: lines[err.line-1]} );
        }
        if (data.hasOwnProperty("implieds") ) {
         for (i = 0; i < data.implieds.length; i += 1) {
             err = data.implieds[i];
             log.push("Implied Gobal "+ err.line+": "+err.name +
            "  "+ lines[err.line[0]-1]);
              block.jshint.implieds.push({"line#": err.line, name:err.name, line: lines[err.line[0]-1]} );

         }            
        }
        if (data.hasOwnProperty("unused") ) {
         for (i = 0; i < data.unused.length; i += 1) {
             err = data.unused[i];
             log.push("Unused "+ err.line+": "+err.name +
            "  "+ lines[err.line-1]);
            block.jshint.unused.push({"line#": err.line, name:err.name, line: lines[err.line-1]} );

         }            
        }

## Markdown

We have here the tools needed to transform markdown documents into something else. 

JS
    
    function (doc) {
        var marked = require('marked');

        doc.addTypes({
            md: "text/x-markdown"
        });

        doc.addCommands( {
                marked : _"Marked"
        });
    }


### Literate Program

By a bit of craziness, this function will take a literate program markdown section and parse it. It returns a compiled document that could then be passed on. 

### Marked

Run the text through the marked script to get html. 

It escapes out _"stuff" so that substitutions survive the transformation and can come after. It also escapes out tex (double dollar signs, single dollar signs, backslash paren and backslash square bracket as delimiters). 

    
    function (code) {


        var lpsnip = [], mathsnip = [];

        var masklit = function (match) {
            lpsnip.push(match);
            return "LITPROSNIP"+(lpsnip.length -1);
        };

        var maskmath = function (match) {
            mathsnip.push(match);
            return "MATHSNIP"+(mathsnip.length-1);
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

Needs marked installed: `npm install marked`   


## HTML 

    function (doc) {

        doc.addTypes({            
            html: "text/html"
        });


        doc.addCommands( {
            "escape" : _"html escape",
            "unescape" : _"html unescape",
            "wrap" : _"wrap"
        });

        doc.addMacros( {
            "jquery" : _"jQuery"
        });

    }


### jQuery

A macro that takes in a version number and outputs the google CDN link. 

    function (v) {
        return '<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/' + 
        (v || '1.9.0') + '/jquery.min.js"></script>';
    }


### HTML Escape 

Escape the given code to be safe in html, e.g., javascript into an html pre element. 

Replace `<>&` with their equivalents. 


    function (code) {
        code = code.replace(/</g, "&lt;");
        code = code.replace(/>/g, "&gt;");
        code = code.replace(/\&/g, "&amp;");
        return code;
    }

### HTML Unescape 

And to undo the escapes: 

    function (code) {
        code = code.replace(/\&lt\;/g, "<");
        code = code.replace(/\&gt\;/g, ">");
        code = code.replace(/\&amp\;/g, "&");
        return code;
    }



### Wrap

Encapsulate the code into an html element.

    function (code, options) {

        var element = options.shift();

        _"|Create attribute list"

        return "<" + element + " " + attributes + ">"+code+"</"+element+ ">";


    }  


JS Create attribute list

We want to create an attribute list for html elements. The convention is that everything that does not have an equals sign is a class name. So we will string them together and throw them into the class, making sure each is a single word. The others we throw in as is. 

    var i, option, attributes = [], klass = [];

    for (i = 0; i < options.length; i += 1) {
        option = options[i];
        if ( option.indexOf("=") !== -1 ) {
            attributes.push(option);
        } else { // class
            klass.push(option.trim());
        }
    }
    if (klass.length > 0 ) {
       attributes.push("class='"+klass.join(" ")+"'");
    }
    attributes = attributes.join(" ");

## README

 # Literate Programming's Standard Library

This is to be used with [literate-program](https://npmjs.org/package/literate-programming) 

It is a node module that contains standard functionality for dealing with common file types. Install it with  `npm install literate-program-standard`. 

It currently has features for javascript files and markdown files. Planned will be css, html, maybe some prepocessors, perhaps r and python. 

## NPM Package

The requisite npm package file. 

JSON 

    {
      "name": "DOCNAME",
      "description": "Standard plugin for literate programming.",
      "version": "DOCVERSION",
      "homepage": "https://github.com/jostylr/literate-programming-standard",
      "author": {
        "name": "James Taylor",
        "email": "jostylr@gmail.com"
      },
      "repository": {
        "type": "git",
        "url": "git://github.com/jostylr/literate-programming-standard.git"
      },
      "bugs": {
        "url": "https://github.com/jostylr/literate-programming-standard/issues"
      },
      "licenses": [
        {
          "type": "MIT",
          "url": "https://github.com/jostylr/literate-programming-standard/blob/master/LICENSE-MIT"
        }
      ],
      "main": "index.js",
      "engines": {
        "node": ">0.6"
      },
      "dependencies":{
        "marked" : "~0.2.7",
        "js-beautify": "~0.3.1",
        "jshint" : "~0.9.1"
      },
      "keywords": ["literate programming"]
    }
