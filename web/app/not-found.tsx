import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid grid-rows-[1fr] items-center justify-items-center min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center text-center">
        <h1 className="text-8xl sm:text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          404
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
          Page not found! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-4">
          <Link
            href="/"
            className="rounded-full border border-solid border-blue-600 transition-colors flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
          >
            Go home
          </Link>
        </div>
      </main>
    </div>
  );
}