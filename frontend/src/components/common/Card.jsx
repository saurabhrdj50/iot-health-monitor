import React, { memo } from 'react';

export const Card = memo(({ title, subtitle, children, className = '', onClick }) => (
  <div
    className={`panel tilt-card gradient-border ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {(title || subtitle) && (
      <div className="panel-header compact">
        <div>
          {title && <h3>{title}</h3>}
          {subtitle && <p className="panel-copy mt-1">{subtitle}</p>}
        </div>
      </div>
    )}
    {children}
  </div>
));

export default Card;
