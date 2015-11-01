"use strict";
let assert = require('assert')
let immutable = require('immutable')

const contradiction = 'contradiction'
const satisfied = 'satisfied'
const assumption = 'assumption'
const given = 'given'

function mapOfSetsAdd(map, key, val) {
  let s;
  if (!map.has(key))
    map.set(key, s = new Set())
  else
    s = map.get(key)
  s.add(val)}

function chooseRandomArrayElement(ary) {
  assert(ary.length > 0)
  return ary[Math.floor(Math.random()*ary.length)]}

function arrayContains(ary, el) {
  return ary.indexOf(el) >= 0}

function indent(n) {
  var res = [];
  for (var i = 0; i < n; i += 1) {
    res.push(' ')}
  return res.join('')}

function compareLit(a, b) {
  return Math.abs(a) - Math.abs(b)}

function compareInt(a, b) {
  return (+a) - (+b)}

function uniq(ary) {
  return Array.from(new Set(ary))}

const verbose = false;

class sat {
  constructor(dimacs) {
    this.initializeStats();
    this.initialDimacs = dimacs
    this.searchAllAssignments = false
    this.maxNumberAssignments = null;
    this.allowLearnClauses = true
    this.solutions = []}

  initializeStats() {
    this.stats = { numClauseSatisfiedChecks: 0,
		   numClauseSatisfiedFulfilled: 0,
		   numFindTwoUnsatisfiedLits: 0,
		   numDecisionVariableHeuristic: 0,
		   numContradictions: 0,
		   numAssignOther: 0,
		   numPropagations: 0,
		   numAgainWatchTwo: 0,
		   numLearnedClauses: 0}}
  
  simplify() {
    verbose && console.log('simplify');
    this.dimacs = (this.initialDimacs
		   .filter(clause => clause.length >= 2))
    let initialAssignments =
	this.processInitialAssignments(
	  this.initialDimacs
	    .filter(clause => clause.length === 1)
	    .map(clause => clause[0]));
    if (initialAssignments === contradiction)
      return contradiction;
			      
    if (verbose) {
      console.log('initial assignments')
      console.log(initialAssignments)}
    
    // TODO: drop variables with only positive uses (also negative)
    // TODO: run a few resolution steps: find variables that appear
    //       not that often and have small numPos*numNeg

    this.watchTwo = this.buildWatchTwo()
    
    verbose && console.log('simplification');
    let as1 = this.makeAssignments(0,
				   new immutable.Map(),
				   initialAssignments,
				   given);
    verbose && console.log('simplification done: ' + as1);
    if (as1 === contradiction)
      return contradiction;
    this.assignments = as1}

  processInitialAssignments(assignments) {
    let res = new Set();
    for (var a of assignments) {
      if (res.has(a))
	continue;
      else if (res.has(-a))
	return contradiction;
      else
	res.add(a)}
    return Array.from(res)}
  
  buildWatchTwo() {
    let res = new Map()
    for (var cid in this.dimacs) {
      var clause = this.dimacs[cid]
      assert(clause.length >= 2)
      mapOfSetsAdd(res, clause[0], cid)
      mapOfSetsAdd(res, clause[1], cid)}
    return res}
  
  dpll() {
    return this.dpllRec(0, this.assignments)}
  
  dpllRec(depth, assignments) {
    verbose && console.log('');
    let someNextLits = this.decisionVariableHeuristic(assignments)
    verbose && console.log(indent(depth), 'someNextLits', someNextLits)
    if (someNextLits.length == 0) {
      // found a solution
      let sa = Array.from(assignments.keySeq());
      sa.sort(compareLit);
      verbose && console.log(indent(depth), '*** ' + sa)
      verbose && console.log(indent(depth), '*** ' +
			     sa.filter(l => l >= 1))

      this.recordAssignment(assignments)
      
      if (this.continueSearching()) {
	// find next solution by faking this solution didn't exist
	return contradiction}
      else
	return satisfied
    }
    let nextLit = chooseRandomArrayElement(someNextLits)
    verbose && console.log(indent(depth), 'nextLit', nextLit)
    
    let as1 = this.makeAssignment(depth, assignments,
				  nextLit, assumption);
    if (as1 !== contradiction) {
      let a = this.dpllRec(depth+1, as1);
      if (a !== contradiction)
	return a}
    
    this.stats.numAssignOther += 1;
    let as2 = this.makeAssignment(depth, assignments,
				  -nextLit, assumption)
    if (as2 === contradiction)
      return contradiction;
    return this.dpllRec(depth+1, as2)}
    

  makeAssignment(depth, assignments, lit0, reason) {
    return this.makeAssignments(depth, assignments, [lit0], reason)}
  
  makeAssignments(depth, assignments0, lits0, reason0) {
    assert(reason0)
    var lits = [];
    var seenLits = new Map();
    for (var lit0 of lits0) {
      lits.push([lit0, reason0])
      seenLits.set(lit0, reason0)}
    var assignments = assignments0;
    
    while (lits.length > 0) {
      let lr = lits.shift();
      let lit = lr[0]
      let reason = lr[1]
      verbose && console.log(indent(depth),
			     'propagating ' + lit
			     + '        ++ ' + assignments.keySeq())
      assert(!assignments.has(lit))
      assert(!assignments.has(-lit))
      assignments = assignments.set(lit, reason)

      let cids = this.watchTwo.get(-lit);
      if (!cids)
	continue;

      for (var cid of cids) {
	let clause = this.dimacs[cid];
	let two = this.upToTwoUnsatisfiedLits(assignments, clause);
	verbose &&
	  console.log(indent(depth+1),
		      'two from', this.dimacs[cid], two)
	if (two === satisfied) {
	  continue}
	else if (two.length == 0) {
	  // TODO: no such case??
	  verbose && 
	    console.log(indent(depth+1),
			'contradiction ' + assignments + '\n')
	  this.stats.numContradictions += 1
	  return contradiction}
	else if (two.length == 1) {
	  let plit = two[0];
	  if (seenLits.has(plit))
	    continue;
	  verbose &&
	    console.log(indent(depth+1), 'will propagate ' + plit)
	  this.stats.numPropagations += 1
	  if (seenLits.has(-plit)) {
	    verbose &&
	      console.log(indent(depth+1),
			  'contradiction with earlier plit\n')
	    this.analyzeConflict(depth+1,
				 assignments,
				 clause,
				 seenLits.get(-plit),
				 -plit,
				 assignments0)
	    return contradiction}
	  lits.push([plit, clause])
	  seenLits.set(plit, clause)}
	else if (two.length == 2) {
	  this.stats.numAgainWatchTwo += 1
	  for (var v of two)
	    mapOfSetsAdd(this.watchTwo, v, cid)}}}
    return assignments}


  analyzeConflict(depth,
		  assignments,
		  laterClause,
		  earlierClause,
		  conflictLit,
		  outerAssignments)
  {
    let ind = indent(depth+1);
    var resolvent = new Set(earlierClause)
    for (var lit of laterClause)
      resolvent.add(lit);
    resolvent.delete(conflictLit)
    resolvent.delete(-conflictLit)
    resolvent = Array.from(resolvent)

    if (this.allowLearnClauses) {
      this.addNewClause(depth, resolvent, outerAssignments)
      this.stats.numLearnedClauses += 1}
    if (verbose) {
      console.log(ind, 'analyzeConflict')
      console.log(ind, 'conflicting literal', conflictLit)
      console.log(ind, 'laterClause', laterClause)
      console.log(ind, 'earlierClause', earlierClause)
      console.log(ind, 'resolvent', resolvent)}}
    
  addNewClause(depth, clause, outerAssignments) {
    if (clause.length < 2) {
      console.log(indent(depth), "TODO: add new given", clause)}
    else {
      var cid = this.dimacs.length;
      this.dimacs[cid] = clause;
      var two = this.upToTwoUnsatisfiedLits(outerAssignments, clause)
      if (two === contradiction
	  || two !== satisfied)
	two = []
      if (two.length < 2) {
	for (var i in clause) {
	  let v = clause[i];
	  if (!arrayContains(two, v)) {
	    two.push(v)
	    if (two.length == 2)
	      break}}}
      verbose &&
	console.log(indent(depth), 'initially watched literals', two)
      mapOfSetsAdd(this.watchTwo, two[0], cid)
      mapOfSetsAdd(this.watchTwo, two[1], cid)}}
  
  
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
	// console.log('' + -lit + ' is not in', assignments)
	// console.log('typeof -lit', typeof (-lit))
	// for (var ax of assignments) {
	//   console.log('typeof ax', typeof ax)}
	res.push(lit)
	if (res.length == 2)
	  break}}
    return res}

  continueSearching() {
    return (
      this.searchAllAssignments
	&& (this.maxNumberAssignments === null
	    || this.maxNumberAssignments > this.solutions.length))}
  
  recordAssignment(assignments) {
    if (this.maxNumberAssignments === null
	|| this.maxNumberAssignments > this.solutions.length)
    {
      this.solutions.push(assignments)}}

}

module.exports = {
  sat: sat,
  contradiction: contradiction,
  satisfied: satisfied
}

// http://www.cs.utexas.edu/users/moore/acl2/seminar/2008.12.10-swords/sat.pdf
// http://jsat.ewi.tudelft.nl/addendum/thesis_as_sent.pdf
// http://www.cs.ubc.ca/~hoos/SATLIB/benchm.html

