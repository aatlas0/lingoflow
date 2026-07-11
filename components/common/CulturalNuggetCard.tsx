import React from 'react';
import type { CulturalNugget } from '../../types';

interface CulturalNuggetCardProps {
    nugget: CulturalNugget;
}

export const CulturalNuggetCard: React.FC<CulturalNuggetCardProps> = ({ nugget }) => {
    return (
        <div className="my-4 p-5 border-l-4 border-gold bg-white rounded-r-xl shadow-md hover:shadow-lg transition-shadow" role="note">
            <div className="flex items-center gap-3 mb-3">
                <div className="bg-gold/20 p-2 rounded-full">
                    <span className="text-xl" aria-hidden="true">💡</span>
                </div>
                <h3 className="text-lg font-bold text-dark-green">{nugget.title}</h3>
            </div>
            <p className="text-dark-green/80 leading-relaxed text-sm md:text-base">{nugget.text}</p>
            <div className="mt-4 flex flex-wrap gap-2">
                {nugget.tags.map(tag => (
                    <span key={tag} className="text-xs font-bold px-3 py-1 bg-desert text-dark-green rounded-full uppercase tracking-wide border border-desert-dark">
                        #{tag}
                    </span>
                ))}
            </div>
        </div>
    );
};