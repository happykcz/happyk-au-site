
import React from 'react';
import { User } from '../types';
import { SparklesIcon } from './icons';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <SparklesIcon className="w-8 h-8 text-blue-600" />
            <span className="ml-3 text-xl font-bold text-slate-800">AI Photo Enhancer</span>
          </div>
          <div className="flex items-center">
            <span className="text-slate-600 mr-4 hidden sm:block">{user.email}</span>
            <img className="h-9 w-9 rounded-full" src={user.avatarUrl} alt="User avatar" />
            <button onClick={onLogout} className="ml-4 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
