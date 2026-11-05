`main.py` is a program that writes secret messages, reads them back, and then uses a loop to crack secret codes. 
A message is encrypted by shifting every letter forward through the alphabet by the same amount. 
With a shift of 3, a becomes d, b becomes e, and z wraps back around to c. For example:

```
meet me at noon   →   phhw ph dw qrrq
```

This program decrypts a message by trying every possible shift. Here is an example output:

```
Welcome to the Code Machine!
Enter a message: wkh wuhdvxuh lv xqghu wkh ehg
Shift 1: vjg vtgcuwtg ku wpfgt vjg dgf
Shift 2: uif usfbtvsf jt voefs uif cfe
Shift 3: the treasure is under the bed
...
Shift 25: xli xviewyvi mw yrhiv xli fih
```