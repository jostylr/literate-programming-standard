# [literate-programming-standard](# "version: 0.2.4-pre")

This is a standard library for literate programming. Originally it was part of literate programming, but to minimize the dependencies of the original, some of it was split off. 

This has the nice effect of forcing a standardized API for plugins and having an example for others to see. 

## Directory structure

Here are the files that are produced by this document. 

* [index.js](#basic-setup  "save: | jshint |jstidy") This is the core plugin file
* [README.md](#readme "save:| clean raw") The project readme file, of course.
* [package.json](#npm-package  "save: | jshint |jstidy") The package file for npm publishing.
* [TODO.md](#todo   "save:| clean raw") A todo list. A wish list, really.

## Basic setup

Each type should be encapsulated into a function that takes in a doc and does its work to modify it. 

    /*global module, require*/
    module.exports = {
        'js' : _"JavaScript",
        'md' : _"Markdown",
        'html' : _"HTML",
        'css' : _"CSS"
    };



## JavaScript

Here we add in the commands `jshint`, `jstidy`, and someday `jsmin`. 

    
    function (doc) {
        var beautify = require('js-beautify').js_beautify;
        var jshint = require('jshint').JSHINT;

        doc.addTypes({
            js: "text/javascript", 
            json: "application/json" 
        });

        doc.addCommands({
            jstidy : _"jstidy",
            jshint : _"jshint",
            ife : _"immediate function execution"
        });
    }


### JSTidy

Run the compiled code through JSBeautify 


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

[main](# "js")

    function (code) {
        var doc = this.doc;
        var block = {};  //currently not stored anywhere

        jshint(code);
        var data = jshint.data();

        _":jshint logging"


        if (log.length > 0 ) {
         doc.log ("!! JSHint:" + this.name+"\n"+log.join("\n"));
        } else {
         doc.log("JSHint CLEAN: " + this.name);
        }

        return code;
    }

Needs jshint installed: `npm install jshint`   

[jshint logging](# "js")

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


### Immediate Function Execution

When writing this snippets of code everywhere, a problem arises as to where to place the scope of the variables. How do we avoid temporary variables from polluting the full scope? And how do we effectively write tests for such snippets? 

The solution is the immediate function expressions. If we enclose a snippet in  `function () {} ()` then we get a nice enclosed scope.  If we also want to add in some parameters from the surrounding (say read-only parameters or something to be evaluated into a closure for later use), then we can do that as well.  

The syntax will be  `ife` for the no parameter version and  `ife(v, w=hidethis)` to have parameters such as `function(v,w) {} (v, hidethis)`  That is, the `=` is used to rename an outer parameter into a different variable name while just a single variable name is assumed to have the outer variable blocked. 

This will is designed to detect whether it is a function or not (by first word being function) and then return the function or simply execute the code. To set the return value by piping,  include `return = text` where text is what one would write after the return: `return text`


    function (code, args) {
        var i, n = args.length;

        var internal = [];
        var external = [];
        var arg,ret; 

        for (i=0; i <n; i +=1 ) {
            arg = args[i] || "";
            arg = arg.split("=").trim();
            if (arg[0] === "return") {
                ret = arg[1] || "";
            } else if (arg.length === 1) {
                internal.push(arg[0]);
                external.push(arg[0]);
            } else if (arg.length === 2) {
                internal.push(arg[0]);
                external.push(arg[1]);
            }

        }

        var start = "(function ( "+internal.join(", ")+" ) {";
        var end = "\n} ( "+external.join(",")+" ) )";

        if (typeof ret === "string") {
            return start + code + "\n return "+ret+";" + end;
        } else if (code.search(/^\s*function/) === -1) {
            return start + code + end;
        } else {
            return start + "\n return "+ code +";"+ end;
        }
    }


### Testing

Once we have this notion of wrapping defined, we can also do jshint on it and do tests. Perhaps if there is a code block of TEST with the following JS structure: [[msg, {outer scope before}, {outer scope after}, return value ]...]  The idea is that we set the tests up as an array of arrays where each of those arrays consists of a description, an initialization, and the final state plus return value. 


## Markdown

We have here the tools needed to transform markdown documents into something else. 

    
    function (doc) {
        var marked = require('marked');

        doc.addTypes({
            md: "text/x-markdown"
        });

        doc.addCommands( {
                marked : _"Marked"
        });
    }


### Marked

Run the text through the marked script to get html. 

It escapes out _"stuff" so that substitutions survive the transformation and can come after. It also escapes out tex (double dollar signs, single dollar signs, backslash paren and backslash square bracket as delimiters). 

    
    function (code) {

        var lpsnip = [], mathsnip = [];

        var masklit = function (match) {
            lpsnip.push(match);
            return "<!--LITPROSNIP"+(lpsnip.length -1)+"-->";
        };

        var maskmath = function (match) {
            mathsnip.push(match);
            return "<!--MATHSNIP"+(mathsnip.length-1)+"-->";
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

Needs marked installed: `npm install marked`   


## HTML 

    function (doc) {

        doc.addTypes({            
            html: "text/html"
        });


        doc.addCommands( {
            "escape" : _"html escape",
            "unescape" : _"html unescape",
            "wrap" : _"wrap",
            "htmltable" : _"html table"
        });

        doc.addConstants( {
            "mathjax" : _"MathJax:main.html | stringify"
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



### MathJax

We the CDN link for [MathJax](http://www.mathjax.org/).
    
[main](# "html")

    <script type="text/x-mathjax-config">
    _":MJ config"
    </script>
    <script type="text/javascript"
      src="http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML">
    </script>

[MJ config](# "js |jshint")
    
    MathJax.Hub.Config({
        extensions: ["tex2jax.js"],
        jax: ["input/TeX", "output/HTML-CSS"],
        tex2jax: {
          inlineMath: [ ['$','$'], ["\\(","\\)"] ],
          displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
          processEscapes: true
        },
        "HTML-CSS": { availableFonts: ["TeX"] }, 
        TeX: {
        Macros: {
          R: '{\\mathbb{R}}',
          C: '{\\mathbb{C}}'    }
        }
    });






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

        _":Create attribute list"

        return "<" + element + " " + attributes + ">"+code+"</"+element+ ">";


    }  


[Create attribute list](# "js")

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


### HTML Table

This expects an object in this.state.obj to be a data structure that htmltable can make a table from. The first argument is the type of object. The rest are attributes, etc. for the table element

[](# "js")

    function (code, options) {
        var type = options.shift();

        var matrix = this.state.obj || [[]]; 

        _"wrap:create attribute list"

        var ret = "<table " + attributes + ">";

        var n = matrix.length, row;

        if (type === "rowswheader") {
            _":rows with header" 
        } else { //if (type === "rows" ) {
            _":body rows"
        }
        ret += "</table>";
        return ret; 
    }

[rows with header](# "js")

    row = matrix[0]; 
    _":make row | substitute(td, th)"

    for (i = 1; i < n; i += 1) {
        row = matrix[i];
        _":make row"
    }

[body rows](# "js")

    for (i = 0; i < n; i += 1) {
        row = matrix[i];
        _":make row"
    }

[make row](# "js")

    ret += "<tr><td>" + row.join("</td><td>") + "</td></tr>";


## CSS

    function (doc) {

        doc.addMacros({
            "bootswatch" : _"Bootswatch"
        });

    }

### Bootswatch

Every time I go to code up my own CSS, I stare at it blankly and run to [Bootswatch](http://bootswatch.com). 

    function (bs) {
        return '<link rel="stylesheet" href="http://bootswatch.com/'+(bs || 'journal') + '/bootstrap.min.css">';
    }


## README

 # Literate Programming's Standard Library

This is to be used with the module [literate-programming](https://npmjs.org/package/literate-programming) 

It is a node module that contains standard functionality for dealing with common file types, such as tidying compiled javscript code. Install it with  `npm install literate-program-standard`. 

It currently has features for javascript files and markdown files. Planned will be css, html, maybe some prepocessors, perhaps r and python. 

 ## List of features 

* jshint, jstidy 
* macro BOOTSWATCH(theme)
*


## TODO

 #TODO

Make full documentation

Add in jsmin


## NPM Package

The requisite npm package file. 


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

## Change Log

0.2.3 --> 0.2.4 Made lp syntax compatible with new syntax. The .js file is unaffected. 

0.2.1 --> 0.2.2 Changed behavior of ife so that it just runs code unless the first word is a function in which case it appends return in front. Behavior overrideable with return = "whatever"
