import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ 
  className, 
  value, 
  defaultValue,
  onChange,
  ...props 
}: React.ComponentProps<"textarea">) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.max(textarea.scrollHeight, 64)
      const maxHeight = 200 // 200px max height
      textarea.style.height = `${Math.min(newHeight, maxHeight)}px`
      
      // Show scrollbar if content exceeds max height
      textarea.style.overflowY = newHeight > maxHeight ? 'auto' : 'hidden'
    }
  }, [])

  React.useEffect(() => {
    adjustHeight()
  }, [value, defaultValue, adjustHeight])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight()
    onChange?.(e)
  }

  return (
    <textarea
      ref={textareaRef}
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Textarea }
