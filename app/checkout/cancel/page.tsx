export const dynamic = 'force-dynamic';

export default function CheckoutCancel() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Reservation cancelled.</h1>
      <p className="mt-2 text-gray-600">
        The unit has been released. You can pick a different one any time.
      </p>
    </main>
  );
}
