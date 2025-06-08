import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700">404</h1>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
            Page not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            as={Link}
            to="/"
            leftIcon={<Home className="h-4 w-4" />}
          >
            Go home
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 