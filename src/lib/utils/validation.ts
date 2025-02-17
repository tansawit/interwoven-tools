export const isValidInitiaAddress = (address: string): boolean => {
  // Initia addresses start with 'init1' and are 39-45 characters long
  const initiaAddressRegex = /^init1[a-zA-Z0-9]{38,44}$/;
  return initiaAddressRegex.test(address);
};

export const isValidAmount = (amount: string): boolean => {
  // Amount should be a positive number with up to 6 decimal places
  const amountRegex = /^\d*\.?\d{0,6}$/;
  const parsedAmount = parseFloat(amount);
  return amountRegex.test(amount) && !isNaN(parsedAmount) && parsedAmount > 0;
};
