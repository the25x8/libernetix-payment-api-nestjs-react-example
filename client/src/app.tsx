import './app.css';
import PaymentForm from './payment/PaymentForm.tsx';
import { ToastContainer } from 'react-toastify';
import { create, CreateTypes } from 'canvas-confetti';
import { useEffect, useRef, useState } from 'preact/hooks';
import PaymentProduct from './payment/PaymentProduct.tsx';

export function App() {
  const confettiRef = useRef<CreateTypes>();
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  // Initialize the confetti canvas
  useEffect(() => {
    const confettiCanvas = document.getElementById(
      'confetti-canvas',
    )! as HTMLCanvasElement;
    confettiRef.current = create(confettiCanvas, {
      resize: true,
      useWorker: true,
    });
  }, []);

  function triggerConfetti() {
    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    if (confettiRef.current) {
      confettiRef.current({
        angle: randomInRange(55, 125),
        spread: randomInRange(120, 200),
        particleCount: randomInRange(100, 100),
        origin: { y: 0.6 },
      });
    }
  }

  function handlePaymentComplete() {
    setPaymentSucceeded(true);
    triggerConfetti();
  }

  return (
    <main className="m-4 sm:m-6">
      <div className="w-full sm:max-w-md sm:mx-auto">
        <header>
          <h1>
            <img className="w-16" src="/preact.svg" alt="Brand logo" />
          </h1>
        </header>

        {paymentSucceeded ? (
          <section className="mt-8">
            <span className="text-3xl">Payment Successful</span>
            <p className="mt-4">
              Thank you for your purchase! An invitation link and payment
              receipt have been sent to your email.
            </p>
            <footer className="mt-4">
              <button
                className="primary"
                onClick={() => setPaymentSucceeded(false)}
              >
                New Purchase
              </button>
            </footer>
          </section>
        ) : (
          <>
            <PaymentProduct />
            <PaymentForm onComplete={handlePaymentComplete} />
          </>
        )}
      </div>
      <ToastContainer />
    </main>
  );
}
