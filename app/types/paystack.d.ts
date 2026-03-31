declare module "@paystack/inline-js" {
  export default class PaystackPop {
    newTransaction(options: {
      key: string;
      email: string;
      amount: number;
      currency: string;
      onSuccess?: () => void;
      onCancel?: () => void;
    }): void;
  }
}
