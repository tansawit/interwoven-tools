import { isValidInitiaAddress, isValidAmount } from '@/lib/utils/validation';

interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export const validateAddress = (
  address: string,
  index: number,
  currentErrors: { [key: string]: string }
): ValidationResult => {
  const errors = { ...currentErrors };

  if (!address) {
    errors[`address-${index}`] = 'Address is required';
    return { isValid: false, errors };
  }

  if (!isValidInitiaAddress(address)) {
    errors[`address-${index}`] = 'Invalid Initia address';
    return { isValid: false, errors };
  }

  delete errors[`address-${index}`];
  return { isValid: true, errors };
};

export const validateAmount = (
  amount: string,
  index: number,
  balance: string,
  currentErrors: { [key: string]: string }
): ValidationResult => {
  const errors = { ...currentErrors };

  if (!amount) {
    errors[`amount-${index}`] = 'Amount is required';
    return { isValid: false, errors };
  }

  if (!isValidAmount(amount)) {
    errors[`amount-${index}`] = 'Invalid amount';
    return { isValid: false, errors };
  }

  const parsedAmount = parseFloat(amount);
  const parsedBalance = parseFloat(balance);

  if (parsedAmount > parsedBalance) {
    errors[`amount-${index}`] = 'Insufficient balance';
    return { isValid: false, errors };
  }

  delete errors[`amount-${index}`];
  return { isValid: true, errors };
};

export const validateBulkInput = (
  input: string,
  balance: string,
  currentErrors: { [key: string]: string }
): ValidationResult => {
  const errors = { ...currentErrors };
  const lines = input.trim().split('\n');
  let isValid = true;

  lines.forEach((line, index) => {
    const [address, amount] = line.trim().split(/\s+/);

    if (!address || !amount) {
      errors[`bulk-${index}`] = 'Invalid format. Expected: address amount';
      isValid = false;
      return;
    }

    if (!isValidInitiaAddress(address)) {
      errors[`bulk-${index}`] = 'Invalid Initia address';
      isValid = false;
      return;
    }

    if (!isValidAmount(amount)) {
      errors[`bulk-${index}`] = 'Invalid amount';
      isValid = false;
      return;
    }

    const parsedAmount = parseFloat(amount);
    const parsedBalance = parseFloat(balance);

    if (parsedAmount > parsedBalance) {
      errors[`bulk-${index}`] = 'Insufficient balance';
      isValid = false;
      return;
    }
  });

  return { isValid, errors };
};
