"use strict";
var fs = require('fs')
var assert = require('assert')

function readDimacs(filename, cont) {
  fs.readFile(
    filename, 'utf-8',
    function (err, content) {
      assert(!err)
      cont(content
	   .split('\n')
	   .filter(line => line.trim().length >=1)
	   .map(line => line.split(/ +/))
	   .filter(line => (line[0] != 'c'
			    && line[0] != 'p'))
	   .map(line =>
		line
		.map(s => parseInt(s, 10))
		.filter(x => x !== 0))
	  )})}

module.exports = {readDimacs: readDimacs}

// readDimacs(process.argv[2], console.log)
