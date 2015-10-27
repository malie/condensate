"use strict";
var fs = require('fs')
var assert = require('assert')

// omg, clauses are limited by '0's not by newlines!

function readDimacs(filename, cont) {
  fs.readFile(
    filename, 'utf-8',
    function (err, content) {
      assert(!err)
      content = content
	.split('\n')
        .filter( line =>
		 ['p', 'c'].indexOf(line.slice(0, 1)) == -1
		 && line.trim() != '')
        .join('\n')
      cont(
	splitClauses(
	  content
	    .split(/[ \t\n\r]+/)
	    .map(s => parseInt(s, 10))))})}

function splitClauses(lits) {
  var i = 0;
  var res = [];
  while (i < lits.length) {
    var j = i+1;
    while (j < lits.length && lits[j] != 0)
      j++;
    let clause = lits.slice(i, j);
    res.push(clause)
    i = j+1}
  return res}

module.exports = {readDimacs: readDimacs}

// readDimacs(process.argv[2], console.log)
