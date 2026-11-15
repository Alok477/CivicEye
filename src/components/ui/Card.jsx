// Card
// Props: title (string, optional header), action (node, right side of header), padded (bool, default true),
//        as (element, default 'section'), className
export default function Card({ title, action, padded = true, as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={`rounded-2xl border border-line bg-surface shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand/15 hover:shadow-lift ${className}`} {...rest}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </Tag>
  )
}
