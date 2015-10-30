"use strict";
var util = require('util')
var assert = require('assert')
var underscore = require('underscore')

var sat = require('./sat')
var logic = require('./logic')

var tseitin = logic.tseitin;
var and = logic.and;
var or = logic.or;
var xor = logic.xor;
var eq = logic.eq;
var nand = logic.nand;
var nor = logic.nor;
var not = logic.not;
var printClauses = logic.printClauses;
var isOp = logic.isOp;
var isVar = logic.isVar;
var clausesToDimacs = logic.clausesToDimacs;


function tseitin_test(x, expected) {
  let res = tseitin(x);
  try {
    assert.deepEqual(res, expected)
  } catch (e) {
    console.log('\nresult is')
    console.log(util.inspect(res, null, 4))
    console.log('\nresult is')
    printClauses(res)
    throw e;
  }}

function tseitin_tests() {
  tseitin_test(
    and(or('a','b'), or('b','c', or('d', 'e'))),
    [['a', 'b' ],
     ['b', 'c', 'd', 'e']])

  tseitin_test(
    and(or(not('a'),'b'),
	or('b',not('c'),
	   or('d', not('e')))),
    [[not('a'), 'b' ],
     ['b', not('c'), 'd', not('e')]])

  tseitin_test(
    and(not('a'),'b'),
    [[not('a')],
     ['b']])

  tseitin_test(
    or(and('a','b'), and('c', 'd')),
    [['AND1', not('a'), not('b')],
     [not('AND1'), 'a'],
     [not('AND1'), 'b'],
     ['AND2', not('c'), not('d')],
     [not('AND2'), 'c'],
     [not('AND2'), 'd'],
     ['AND1', 'AND2']])


  function randomArrayElement(ary) {
    assert(ary.length > 0)
    return ary[Math.floor(Math.random()*ary.length)]}

  var variables = ["a", "b", "c", "d", "e", "f"];
  
  function generate_random_expression(size) {
    if (size > 0.5 && Math.random() > 0.9)
      return not(generate_random_expression(size-0.5))
    else if (size >= 2) {
      let conn = randomArrayElement([and, or, nor, nand, xor, eq])
      let sr = size-1;
      let s2 = Math.random()*sr;
      let a = generate_random_expression(s2);
      let b = generate_random_expression(sr-s2);
      return conn(a, b)}
    else {
      var lit = randomArrayElement(variables)
      if (Math.random() > .5)
	lit = not(lit)
      return lit}}

  function used_variables(x) {
    if (isVar(x))
      return new Set([x])
    else {
      assert(isOp(x));
      return unionSets(x.args.map(used_variables))}}

  function unionSets(sets) {
    var res = new Set();
    for (var set of sets) {
      for (var el of set) {
	res.add(el)}}
    return res}
  
  function enumerate_solutions(x) {
    var solutions = [];
    var uv = Array.from(used_variables(x))
    uv.sort();
    var n = 1 << uv.length;
    for (var asg = 0; asg < n; asg+=1) {
      function val(v) {
	let idx = uv.indexOf(v);
	assert(idx >= 0);
	return (asg & (1<<idx)) > 0 ? 1 : 0}
      var assignment = {}
      for (var v of uv) {
	assignment[v] = val(v)}
      if (checkSatisfied(x, assignment))
	solutions.push(assignment)}
    return solutions}

  function arrayAny(ary, pred) {
    for (var el of ary) {
      if (pred(el))
	return true}
    return false}

  function arraySum(ary, pred) {
    var sum = 0;
    for (var el of ary)
      sum += el
    return sum}

  function checkSatisfied(x, v) {
    if (isVar(x))
      return v[x]
    else {
      assert(isOp(x));
      var args = x.args.map( arg => checkSatisfied(arg, v));
      if (x.op === logic.NOT) {
	return !args[0]}
      else if (x.op === logic.AND) {
	if (arrayAny(args, a => a==0)) return 0;
	return 1}
      else if (x.op === logic.OR) {
	if (arrayAny(args, a => a==1)) return 1;
	return 0}
      else if (x.op === logic.NAND) {
	if (arrayAny(args, a => a==0)) return 1;
	return 0}
      else if (x.op === logic.NOR) {
	if (arrayAny(args, a => a==1)) return 0;
	return 1}
      else if (x.op === logic.EQ) {
	return (arraySum(args) & 1) == 0}
      else if (x.op === logic.XOR) {
	return (arraySum(args) & 1) == 1}
      else assert(false)}}

  var showDIMACS = 0
  
  for (var i = 0; i < 1000; i++) {
    var size = Math.floor(1.5+1.5*Math.log(1+i));
    let rx = generate_random_expression(size);

    console.log('\nexpression (of size ' + size + ')')
    console.log(util.inspect(rx, null, 20))

    let ts = tseitin(rx);
    console.log('\ncnf:')
    printClauses(ts)

    let d = clausesToDimacs(ts)
    if (showDIMACS) {
      console.log('\ndimacs:')
      printClauses(d.dimacs)}

    console.log('\ndpll:')
    let s = new sat.sat(d.dimacs)
    s.searchAllAssignments = true
    // s.allowLearnClauses = allowLearnClauses
    var res = s.simplify();
    if (res === sat.contradiction)
      console.log('  contradiction in simplification')
    else {
      res = s.dpll();
      if (res === sat.contradiction && s.solutions.length == 0)
	console.log('  contradiction')
      else {
	if (showDIMACS) {
	  for (var solution of s.solutions) {
	    console.log(solution.keySeq())}
	  console.log('\n')}

	var uv = Array.from(used_variables(rx))
	uv.sort();

	var solutions = []
	for (var solution of s.solutions) {
	  
	  function itn(i) {
	    var sign = i < 0 ? '-' : '';
	    return sign + d.indexToName.get(Math.abs(i))}
	  console.log(
	    Array.from(solution.keySeq()).map(itn).join(' '))
	  
	  var dsol = {}
	  for (var v of uv) {
	    let vi = d.nameToIndex.get(v);
	    dsol[v] = (
	      solution.has(-vi) ? 0
		: solution.has(vi) ? 1
		: assert(false))}
	  solutions.push(dsol)}
	console.log(util.inspect(solutions))

	console.log('\nsolutions:')
	var esolutions = enumerate_solutions(rx);
	for (var esol of esolutions) {
	  if (!arrayAny(solutions,
			s => underscore.isEqual(s, esol))) {
	    assert(false, 'dpll misses: ' + esol)}}

	for (var dsol of solutions) {
	  if (!arrayAny(esolutions,
			s => underscore.isEqual(s, dsol))) {
	    assert(false, 'dpll has too much: ' + dsol)}}
      }
    }

  }
  
  
  console.log('ok')
}


//   console.log(util.inspect(input, null, 5))
// let ts = tseitin(input)
// console.log(util.inspect(ts, null, 5))
tseitin_tests()
