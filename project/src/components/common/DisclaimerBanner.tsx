import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { DISCLAIMER } from '../../utils/constants';

const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-warning/10 border-l-4 border-warning p-4 mb-6 rounded-r">
      <div className="flex items-start">
        <AlertTriangle className="h-6 w-6 text-warning flex-shrink-0 mr-3" />
        <p className="text-sm text-text-primary">
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
};

export default DisclaimerBanner;