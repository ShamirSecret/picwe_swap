import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const selected = options.find(opt => opt.value === value);
    setSelectedOption(selected);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className={`token-select ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
      <div 
        className="select-header" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <div className="select-option">
            {selectedOption.logo && (
              <img 
                src={selectedOption.logo} 
                alt="" 
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <span>{selectedOption.label}</span>
          </div>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className="select-option"
              onClick={() => handleSelect(option)}
            >
              {option.logo && (
                <img 
                  src={option.logo} 
                  alt="" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect; 