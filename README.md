# condensate
a SAT solver in javascript

* DPLL algorithm
* two-watched-literals
* very simple CDCL (only one clause from every conflict)


todo:

* how to choose the two watch literals? prefer uncommon vars?
* CDCL resolvent can be one single literal, simplify again.
     (that's a very useful case!)
* decision variable heuristic
* measure usefulness of the learn clauses, drop the least useful

