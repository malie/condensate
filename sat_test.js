"use strict";
var sat = require('./sat')
let randomCNF = require('./randomCNF')

function verboseTest(cnf, numTries, allowLearnClauses) {
  numTries = numTries || 1;
  var csc = []
  let s = new sat.sat(cnf)
  s.allowLearnClauses = allowLearnClauses
  s.searchAllAssignments = true
  s.maxNumberAssignments = 10;
  var res = s.simplify();
  if (res === sat.contradiction) {
    console.log('result, contradiction in simplification')
    return}
  for (var t = 0; t < numTries; t++) {

    console.log('num clauses', s.dimacs.length)
    
    var start = +new Date();
    res = s.dpll();
    var end = +new Date();
    
    console.log('result:', res)
    console.log('num assignments:', s.solutions.length)
    
    if (s.solutions.length > 0) {
      for (var solution of s.solutions) {
	console.log(solution.keySeq())}}
    console.log('time', end-start)
    console.log(s.stats)
    csc.push(s.stats.numClauseSatisfiedChecks)
    s.initializeStats()}
  // csc.sort(compareInt)
  return csc}

function test1() {
  verboseTest([[1]])
  verboseTest([[-1]])
  verboseTest([[-1],[-2]])
  verboseTest([[-1, 2],[-2, 3], [-3,4]])
  verboseTest(
    [[1,2,3], [-1,-2], [-2,-3], [3,4,5], [-4,5], [4, -5],
     [1,5,6], [-1,-5], [-5, -6], [2,-6], [-2,6],
     // [-2]
    ])
}

function test2() {
  let numVars = 50;
  let numClauses3 = Math.floor(4.2 * numVars);
  let numClauses2 = 0; // Math.floor(0.5 * numVars);
  let numClauses1 = 0; // Math.floor(0.01 * numVars);
  let cnf3 = randomCNF.randomCNF(3, numVars, numClauses3);
  let cnf2 = randomCNF.randomCNF(2, numVars, numClauses2);
  let cnf1 = randomCNF.randomCNF(1, numVars, numClauses1);
  let cnf = [].concat(cnf1, cnf2, cnf3);
  for (var clause of cnf)
    console.log(clause)
  verboseTest(cnf, 50)}

function test3() {
  let numVars = 70;
  let numClauses3 = Math.floor(4.2 * numVars);
  let numClauses2 = Math.floor(0 * numVars);
  let numClauses1 = 0; // Math.floor(0.01 * numVars);
  let cnf3 = randomCNF.randomCNF(3, numVars, numClauses3);
  let cnf2 = randomCNF.randomCNF(2, numVars, numClauses2);
  let cnf1 = randomCNF.randomCNF(1, numVars, numClauses1);
  let cnf = [].concat(cnf1, cnf2, cnf3);
  for (var clause of cnf)
    console.log(clause)
  let ra = verboseTest(cnf, 7, false)
  let rb = verboseTest(cnf, 50, true)
  console.log(ra);
  console.log(rb)}

function test4() {
  dimacs.readDimacs(
    process.argv[2],
    function (cnf) {
      for (var clause of cnf)
	console.log(clause)
      verboseTest(cnf)})}

test1();
// test2();
// test3();
