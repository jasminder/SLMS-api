export function capitalizeFirstCharacter(str: string) {
    if (!str) return str // return the original string if it's empty or not a string
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  