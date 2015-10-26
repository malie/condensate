"use strict";
let assert = require('assert')
let immutable = require('immutable')

let dimacs = require('./dimacs')

const contradiction = 'contradiction'
const satisfied = 'satisfied'

function mapOfSetsAdd(map, key, val) {
  let list;
  if (!map.has(key))
    map.set(key, list = new Set())
  else
    list = map.get(key)
  list.add(val)}

function chooseRandomArrayElement(ary) {
  assert(ary.length > 0)
  return ary[Math.floor(Math.random()*ary.length)]}

function arrayContains(ary, el) {
  return ary.indexOf(el) >= 0}

class sat {
  constructor(dimacs) {
    this.dimacs = dimacs
    // TODO: simplify from unit clauses
    // TODO: uniquify literals in clauses, also drop [-3,3,...] clauses
    // TODO: drop variables with only positive mentions (also negative)
    this.assignments = new immutable.Set()
    this.watchTwo = this.buildWatchTwo()
    this.searchAllAssignments = false
    this.stats = { numClauseSatisfiedChecks: 0,
		   numClauseSatisfiedFulfilled: 0,
		   numFindTwoUnsatisfiedLits: 0,
		   numDecisionVariableHeuristic: 0,
		   numContradictions: 0,
		   numPropagations: 0,
		   numAgainWatchTwo: 0}}
  
  buildWatchTwo() {
    let res = new Map()
    for (var cid in this.dimacs) {
      var clause = this.dimacs[cid]
      assert(clause.length >= 2)
      mapOfSetsAdd(res, clause[0], cid)
      mapOfSetsAdd(res, clause[1], cid)}
    return res}
  
  dpll() {
    this.dpllRec(this.assignments)}
  
  dpllRec(assignments) {
    console.log('');
    let someNextLits = this.decisionVariableHeuristic(assignments)
    if (someNextLits.length == 0) {
      // found a solution
      console.log('*** ' + assignments)
      if (this.searchAllAssignments)
	return contradiction
      else
	return satisfied
    }
    let nextLit = chooseRandomArrayElement(someNextLits)
    console.log('nextLit', nextLit)
    let a = this.dpllWithAssignments(assignments, nextLit);
    if (a !== contradiction)
      return a;
    return this.dpllWithAssignments(assignments, -nextLit)}

  dpllWithAssignments(assignments0, lit0) {
    var lits = [lit0];
    var seenLits = new Set(lits);
    var assignments = assignments0;
    while (lits.length > 0) {
      let lit = lits.shift();
      console.log('propagating ' + lit + '        ++ ' + assignments)
      assert(!assignments.has(lit))
      assert(!assignments.has(-lit))
      assignments = assignments.add(lit)

      let cids = this.watchTwo.get(-lit);
      if (!cids)
	continue;

      for (var cid of cids) {
	let clause = this.dimacs[cid];
	let two = this.upToTwoUnsatisfiedLits(assignments, clause);
	console.log('two from', this.dimacs[cid], two)
	if (two === satisfied) {
	  continue}
	else if (two.length == 0) {
	  console.log('contradiction ' + assignments + '\n')
	  this.stats.numContradictions += 1
	  return contradiction}
	else if (two.length == 1) {
	  console.log('will propagate ' + two)
	  this.stats.numPropagations += 1
	  let plit = two[0];
	  if (seenLits.has(-plit)) {
	    console.log('contradiction with earlier plit\n')
	    return contradiction}
	  lits.push(plit)
	  seenLits.add(plit)}
	else if (two.length == 2) {
	  this.stats.numAgainWatchTwo += 1
	  for (var v of two)
	    mapOfSetsAdd(this.watchTwo, v, cid)}}}
    return this.dpllRec(assignments)}

  decisionVariableHeuristic(assignments) {
    // returns a list of lits to try next
    this.stats.numDecisionVariableHeuristic += 1;
    let res = [];
    for (var clause of this.dimacs)
      for (var lit of clause) {
	if (!assignments.has(lit)
	    && !assignments.has(-lit)
	    && !arrayContains(res, lit)
	    && !arrayContains(res, -lit))
	{
	  res.push(lit);
	  if (res.length == 4)
	    return res}}
    return res}

  upToTwoUnsatisfiedLits(assignments, clause) {
    this.stats.numClauseSatisfiedChecks += 1
    for (var lit of clause) {
      if (assignments.has(lit)) {
	this.stats.numClauseSatisfiedFulfilled += 1
	return satisfied}}
    this.stats.numFindTwoUnsatisfiedLits += 1
    let res = [];
    for (var lit of clause) {
      if (!assignments.has(-lit)) {
	res.push(lit)
	if (res.length == 2)
	  break}}
    return res}
}

// http://www.cs.utexas.edu/users/moore/acl2/seminar/2008.12.10-swords/sat.pdf
// http://jsat.ewi.tudelft.nl/addendum/thesis_as_sent.pdf

function verboseTest(cnf) {
  let s = new sat(cnf)
  let res = s.dpll();
  console.log('result: ' + res)
  console.log(s.stats)}

function test1() {
  let cnf = [[1,2,3], [-1,-2], [-2,-3], [3,4,5], [-4,5], [4, -5],
	     [1,5,6], [-1,-5], [-5, -6], [2,-6], [-2,6]]
  verboseTest(cnf)}

function test2() {
  dimacs.readDimacs(
    process.argv[2],
    function (cnf) {
      verboseTest(cnf)})}

test1();
