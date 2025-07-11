import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ 
  size = "normal", 
  withLink = true,
  className = ""
}) => {
  const sizeClasses = {
    small: "text-lg",
    normal: "text-2xl",
    large: "text-3xl"
  };
  
  // The key fix is ensuring proper flex alignment with items-center
  const logoContent = (
    <span className={`font-secondary font-bold ${sizeClasses[size]} ${className} flex items-center`}>
      <i className="fas fa-music text-accent mr-2"></i>
      SongSculptors
    </span>
  );
  
  if (withLink) {
    return (
      <Link to="/" className="flex items-center">
        {logoContent}
      </Link>
    );
  }
  
  return logoContent;
};

export default Logo;