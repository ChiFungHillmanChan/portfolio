import { useEffect } from 'react';

const MyOfferHub = () => {
  useEffect(() => {
    window.location.replace('https://buymeacoffee.com/hillmanchan709');
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-lg text-gray-700 dark:text-gray-200">
        Redirecting you to Buy Me a Coffee...
      </p>
    </div>
  );
};

export default MyOfferHub;
