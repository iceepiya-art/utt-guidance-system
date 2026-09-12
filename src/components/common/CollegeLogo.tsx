import React from 'react';

interface CollegeLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
}

export const CollegeLogo: React.FC<CollegeLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'text-[#075A9C]',
  subtextColor = 'text-[#087CC1]',
}) => {
  const sizeMap = {
    sm: { img: 'w-9 h-9', text: 'text-sm', subtext: 'text-[10px]' },
    md: { img: 'w-11 h-11', text: 'text-base', subtext: 'text-xs' },
    lg: { img: 'w-14 h-14', text: 'text-lg', subtext: 'text-sm' },
    xl: { img: 'w-24 h-24 sm:w-28 sm:h-28', text: 'text-2xl', subtext: 'text-base' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official College Emblem Image */}
      <div className={`relative flex-shrink-0 ${currentSize.img} flex items-center justify-center`}>
        <img
          src="/logo-utt.png"
          alt="ตราสัญลักษณ์ วิทยาลัยเทคโนโลยีอุตรดิตถ์"
          className="w-full h-full object-contain drop-shadow-xs select-none"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      </div>

      {/* College Typography */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold tracking-tight ${textColor} ${currentSize.text}`}>
            วิทยาลัยเทคโนโลยีอุตรดิตถ์
          </span>
          <span className={`font-medium tracking-wide uppercase ${subtextColor} ${currentSize.subtext}`}>
            Uttaradit Technological College
          </span>
        </div>
      )}
    </div>
  );
};
