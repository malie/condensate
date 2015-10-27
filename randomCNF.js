"use strict";
function randomCNF(clauseSize, numVars, numClauses) {
  var res = [];
  for (var i = 0; i < numClauses; i+=1)
    res.push(randomClause(clauseSize, numVars))
  return res}

function randomClause(size, numVars) {
  var res = [];
  var seen = new Set();
  while (res.length < size) {
    let lit = randomLiteral(numVars);
    let v = Math.abs(lit);
    if (seen.has(v))
      continue;
    seen.add(v)
    res.push(lit)}
  return res}

function randomLiteral(numVars) {
  let v = 1 + Math.floor(Math.random()*numVars);
  let sign = Math.random() > 0.5 ? -1 : 1;
  return v * sign}
      
module.exports = {randomCNF: randomCNF,
		  randomClause: randomClause,
		  randomLiteral: randomLiteral}

// readDimacs(process.argv[2], console.log)
