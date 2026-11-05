ALPHABET = "abcdefghijklmnopqrstuvwxyz"

def shift_letter(letter, n):
    letter_index = ALPHABET.find(letter)
    overflow = letter_index + n - 25
    if overflow >= 0:
        return ALPHABET[overflow - 1]
    else:
        return ALPHABET[letter_index + n]

def encode(message, n):
    result = ""
    for i in range(len(message)):
        if message[i].lower() in ALPHABET:
            result += shift_letter(message[i], n)
        else:
            result += message[i]
    return result

def decode(message, n):
    result = ""
    for i in range(len(message)):
        if message[i].lower() in ALPHABET:
            result += shift_letter(message[i], n)
        else:
            result += message[i]
    return result

def crack(message):
    for i in range(1, len(ALPHABET)):
        decoded_message = decode(message, -i)
        print(f"Shift {i}: {decoded_message}")    

def main():
    # Delete pass and start writing your code!
    print("Welcome to the Code Machine!")
    user_message = input("Enter a message: ")
    crack(user_message)

if __name__ == "__main__":
    main()
