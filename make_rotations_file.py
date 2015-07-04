difficulties = [
'4x',
'5x',
'6x',
'7x',
'5x',
'6x',
]

pcounts = [
'2p',
'3p',
'4p',
'5p',
'2p',
'3p',
'4p',
]

expansions = [
None,
'on_the_brink',
'on_the_brink-in_the_lab',
'state_of_emergency',
'on_the_brink-in_the_lab-state_of_emergency',
]

def make_rules(pcount, difficulty, expansion):
  parts = [pcount, difficulty]
  if expansion:
    parts.extend(expansion.split('-'))
  return '-'.join(parts)


for i in xrange(5*6*7):
  print make_rules(
      pcounts[i%7],
      difficulties[i%6],
      expansions[i%5]
      )
