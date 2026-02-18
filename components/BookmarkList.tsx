'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Bookmark = {
  id: string
  user_id: string
  url: string
  title: string
  created_at: string
}

export default function BookmarkList({ 
  initialBookmarks, 
  userId 
}: { 
  initialBookmarks: Bookmark[]
  userId: string 
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const supabase = createClient()

  useEffect(() => {
  console.log('Setting up Realtime subscription for user:', userId)
  
  const channel = supabase
    .channel('bookmarks-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookmarks',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔥 Realtime event received:', payload)
        
        if (payload.eventType === 'INSERT') {
          console.log('Adding bookmark to state:', payload.new)
          setBookmarks((current) => [payload.new as Bookmark, ...current])
        }
        
        if (payload.eventType === 'DELETE') {
          console.log('Removing bookmark from state:', payload.old.id)
          setBookmarks((current) => 
            current.filter((bookmark) => bookmark.id !== payload.old.id)
          )
        }
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status)
    })

  return () => {
    console.log('Cleaning up Realtime subscription')
    supabase.removeChannel(channel)
  }
}, [supabase, userId])

  const handleDelete = async (id: string) => {
  console.log('Deleting bookmark with id:', id)
  
  const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting bookmark:', error)
    } else {
        console.log('Delete successful')
    }
    }

  if (bookmarks.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No bookmarks yet. Add your first one above!
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {bookmark.title}
            </h3>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate block"
            >
              {bookmark.url}
            </a>
          </div>
          <button
            onClick={() => handleDelete(bookmark.id)}
            className="ml-4 text-red-600 hover:text-red-800 font-medium text-sm"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}