import React from 'react';
import { Edit2, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BrandIcon from './BrandIcon';

const SortableLink = ({ link, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group flex flex-col items-center w-14 sm:w-16 md:w-20 touch-none z-10 hover:z-50">
      <a href={link.url} className="flex flex-col items-center gap-2 hover:-translate-y-2 transition-all duration-200 w-full cursor-grab active:cursor-grabbing">
        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-lg hover:shadow-xl hover:shadow-black/30 transition-all shrink-0">
          <BrandIcon type={link.icon} url={link.url} />
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-white/70 group-hover:text-white tracking-wide w-full text-center truncate px-0.5 transition-colors"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
          title={link.name}>
          {link.name}
        </span>
      </a>
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 z-20">
        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(link); }} className="bg-blue-500 hover:bg-blue-400 text-white p-1 sm:p-1.5 rounded-lg shadow-lg hover:scale-110 transition-all cursor-pointer" title="Edit Shortcut"><Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(link.id); }} className="bg-red-500 hover:bg-red-400 text-white p-1 sm:p-1.5 rounded-lg shadow-lg hover:scale-110 transition-all cursor-pointer" title="Delete Shortcut"><X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
      </div>
    </div>
  );
};

export default SortableLink;