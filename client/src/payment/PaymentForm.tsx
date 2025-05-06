import { Field, Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useRef, useState } from 'preact/hooks';
import { IMaskInput } from 'react-imask';
import { toast } from 'react-toastify';
import {
  CreatePaymentIntentRequest,
  IPaymentBankAcs,
  IPaymentIntentResponse,
} from './types.ts';

interface PaymentFormValues {
  email: string;
  cardholderName: string;
  cardNumber: string;
  expires: string;
  cvv: string;
  country: string;
  zipCode: string;
  rememberCard: boolean;
}

const PaymentSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  cardholderName: Yup.string()
    .min(2, 'Too Short!')
    .max(50, 'Too Long!')
    .required('Cardholder name is required'),
  cardNumber: Yup.string()
    .matches(/^[0-9]{16}$/, 'Card number must be 16 digits')
    .required('Card number is required'),
  expires: Yup.string()
    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Invalid expiration date')
    // Custom check that YY is greater than current year
    .test('is-future-date', 'Card has expired', (value) => {
      if (!value) return false;
      const [month, year] = value.split('/').map(Number);
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      return (
        year > currentYear || (year === currentYear && month > currentMonth)
      );
    })
    .required('Expiration date is required'),
  cvv: Yup.string()
    .matches(/^[0-9]{3}$/, 'CVV must be 3 digits')
    .required('CVV is required'),
  country: Yup.string()
    .matches(/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters')
    .required('Country code is required'),
  zipCode: Yup.string().test(
    'len',
    'Must be exactly 5 characters',
    (val) => val?.length === 5,
  ),
  rememberCard: Yup.boolean().required('Remember card is required'),
});

const PaymentForm = ({ onComplete }: { onComplete: () => void }) => {
  const cardNumberRef = useRef(null);
  const expiresRef = useRef(null);
  const [required3DS, setRequired3DS] = useState<IPaymentBankAcs>();

  const initialValues: PaymentFormValues = {
    email: '',
    cardholderName: '',
    cardNumber: '',
    expires: '',
    cvv: '',
    country: '',
    zipCode: '',
    rememberCard: true, // default to true
  };

  async function handlePaymentIntent(
    values: PaymentFormValues,
    actions: FormikHelpers<PaymentFormValues>,
  ) {
    // Merge form values with additional client fields
    const params: CreatePaymentIntentRequest = {
      ...values,
      rememberCard: values.rememberCard ? 'on' : 'off',
      javaEnabled: false,
      javascriptEnabled: true,
      colorDepth: screen.colorDepth,
      utcOffset: new Date().getTimezoneOffset(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };

    let data: IPaymentIntentResponse;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/v1/payments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(params),
        },
      );
      data = await response.json();

      // Handle http errors
      if (response.status === 400) {
        toast.error('Invalid payment details', {
          type: 'error',
        });
        return;
      }
      if (!response.ok) {
        console.error('Failed to create purchase', data);
        return;
      }
    } catch (e) {
      // Handle network errors
      console.error('Network error:', e);
      toast('Could not connect to payment server', {
        type: 'error',
      });

      return;
    } finally {
      actions.setSubmitting(false);
    }

    // Payment was created successfully
    if (!data) return;
    try {
      await processCreatedPayment(data);
    } catch (e) {
      console.error('Error processing payment:', e);
      toast.error('Error processing payment', {
        type: 'error',
      });
    }
  }

  async function processCreatedPayment(data: IPaymentIntentResponse) {
    switch (data.status) {
      case 'executed':
        console.log('Payment executed successfully');
        paymentSucceeded();
        break;

      case '3DS_required':
        // Save 3DS data for later use
        if (data.bankAcs?.Method === 'POST') {
          try {
            const response = await fetch(data.bankAcs.URL, {
              method: 'POST',
              redirect: 'follow',
              mode: 'no-cors',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                MD: data.bankAcs.MD || '',
                PaReq: data.bankAcs.PaReq,
                // TODO Build valid termUrl (docs are not clear on this one)
                TermUrl: 'http://localhost:4178/v1/payments/term',
              }),
            });

            // Handle redirects
            if (response.type === 'opaqueredirect') {
              console.log('URL:', response.url);
              return;
            }

            // Handle http errors
            if (response.status === 400) {
              toast.error('Invalid payment details', {
                type: 'error',
              });
              return;
            }

            if (!response.ok) {
              console.error('Failed to create purchase');
              return;
            }

            const result = await response.json();
            console.log('Payment executed successfully', result);
          } catch (e) {
            // Network error
            console.error('Network error:', e);
            toast('Could not connect to payment server', {
              type: 'error',
            });
          }

          return;
        }

        setRequired3DS(data.bankAcs);
        console.log('3DS required', data);
        break;

      default:
        console.error('Unknown payment status:', data.status);
    }
  }

  function paymentSucceeded() {
    onComplete();
  }

  return (
    <>
      <Formik
        validateOnChange
        initialValues={initialValues}
        validationSchema={PaymentSchema}
        onSubmit={handlePaymentIntent}
      >
        {(props) => (
          <Form>
            <h1>Pay with card</h1>
            <div className="mt-4 flex flex-col">
              <label htmlFor="email">Email</label>
              <Field id="email" name="email" placeholder="your@email.com" />
              {props.errors.email && props.touched.email && (
                <div className="text-red-500">{props.errors.email}</div>
              )}
            </div>
            <div className="mt-6">
              <h2>Card information</h2>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <label htmlFor="cardNumber" className="sr-only">
                    Card Number
                  </label>
                  <IMaskInput
                    mask="0000 0000 0000 0000"
                    type="text"
                    value={props.values.cardNumber}
                    unmask={true} // true|false|'typed'
                    ref={cardNumberRef}
                    onAccept={
                      // depending on prop above first argument is
                      // `value` if `unmask=false`,
                      // `unmaskedValue` if `unmask=true`,
                      // `typedValue` if `unmask='typed'`
                      (value, _) => {
                        void props.setFieldValue('cardNumber', value);
                      }
                    }
                    onBlur={() => props.setFieldTouched('cardNumber', true)}
                    placeholder="4000 0000 0000 0000"
                  />
                  {props.errors.cardNumber && props.touched.cardNumber && (
                    <div className="text-red-500">
                      {props.errors.cardNumber}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col flex-1 min-w-0">
                    <label htmlFor="expires" className="sr-only">
                      Expires
                    </label>
                    <IMaskInput
                      mask="00/00"
                      type="text"
                      value={props.values.expires}
                      unmask={false} // true|false|'typed'
                      ref={expiresRef}
                      onAccept={
                        // depending on prop above first argument is
                        // `value` if `unmask=false`,
                        // `unmaskedValue` if `unmask=true`,
                        // `typedValue` if `unmask='typed'`
                        (value, _) => props.setFieldValue('expires', value)
                      }
                      onBlur={() => props.setFieldTouched('expires', true)}
                      placeholder="MM/YY"
                    />
                    {props.errors.expires && props.touched.expires && (
                      <div className="text-red-500">{props.errors.expires}</div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <label htmlFor="cvv" className="sr-only">
                      CVV
                    </label>
                    <Field id="cvv" name="cvv" placeholder="CVV" />
                    {props.errors.cvv && props.touched.cvv && (
                      <div className="text-red-500">{props.errors.cvv}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <label htmlFor="cardholderName">Name on card</label>
                  <Field
                    id="cardholderName"
                    name="cardholderName"
                    placeholder="John Doe"
                  />
                  {props.errors.cardholderName &&
                    props.touched.cardholderName && (
                      <div className="text-red-500">
                        {props.errors.cardholderName}
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h2>Country or region</h2>
              <div className="flex-col flex gap-2">
                <div className="flex flex-col">
                  <label htmlFor="country" className="sr-only">
                    Country or region
                  </label>
                  <Field as="select" name="country" id="country">
                    <option disabled value="">
                      Select country
                    </option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="MX">Mexico</option>
                  </Field>
                  {props.errors.country && props.touched.country && (
                    <div className="text-red-500">{props.errors.country}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label htmlFor="zipCode" className="sr-only">
                    Zip Code
                  </label>
                  <Field id="zipCode" name="zipCode" placeholder="Zip code" />
                  {props.errors.zipCode && props.touched.zipCode && (
                    <div className="text-red-500">{props.errors.zipCode}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col">
              <label
                htmlFor="rememberCard"
                className="cursor-pointer flex gap-4 px-1"
              >
                <Field type="checkbox" name="rememberCard" id="rememberCard" />
                <span className="font-normal text-base">
                  Securely save card information for future purchases
                </span>
              </label>
            </div>

            <footer className="mt-6">
              <button
                type="submit"
                className="w-full primary"
                disabled={props.isSubmitting || !props.isValid || !props.dirty}
              >
                {props.isSubmitting ? 'Processing...' : 'Pay'}
              </button>
            </footer>
          </Form>
        )}
      </Formik>
      {!!required3DS && (
        <div className="fixed top-0 left-0 w-full h-full p-4 sm:p-8 flex justify-center items-center bg-gray-200/50">
          <div className="bg-white w-full max-w-md min-h-[240px]">
            <pre>{JSON.stringify(required3DS, null, 2)}</pre>

            <div className="flex justify-center">
              <button
                className="secondary"
                onClick={() => setRequired3DS(undefined)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentForm;
