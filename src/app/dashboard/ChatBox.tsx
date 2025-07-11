"use client"

import { useEffect, useRef, useState } from "react"
import { getSession } from "next-auth/react"
import Image from "next/image"
import React from "react"
import axios from "axios"
import UserInfoBox from './UserInfoBox'
import { Image as ImageIcon, FileText, FileType2, FileSpreadsheet, Presentation, FileArchive, File, X, Paperclip, Send, Mic, Smile, Check, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from 'react-toastify'

interface ChatContact {
  email: string
  name: string
  image: string | null
  bio?: string
  isOnline?: boolean
  lastSeen?: string | Date
  found: boolean
}

interface Contact {
  email: string
  name: string
  image: string | null
  found: boolean
  bio?: string
}

interface ChatMessage {
  from: string
  text: string
  file?: {
    url: string
    name: string
    type: string
    size?: number
  }
  createdAt?: string | Date
  status?: string
}

export default function ChatBox({
  targetEmail,
  onAddContact,
  onRefreshContacts,
  onUnknownMessage,
}: {
  targetEmail: string
  onAddContact?: (contact: Contact) => void
  onRefreshContacts?: () => Promise<void>
  onUnknownMessage?: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState("")
  const [contact, setContact] = useState<ChatContact | null>(null)
  const [hasAddedContact, setHasAddedContact] = useState(false)
  const [contactNotification, setContactNotification] = useState<string | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const selfEmailRef = useRef<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userInfoOpen, setUserInfoOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null)
  const [deletingMessageIds, setDeletingMessageIds] = useState<string[]>([])
  const [longPressedMsgId, setLongPressedMsgId] = useState<string | null>(null)
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Mobile-specific states
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null)

  // Add state for selected message for toolbar actions
  const [selectedMsgForAction, setSelectedMsgForAction] = useState<{ id: string, text: string, file?: any } | null>(null)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />
    } else if (fileType === "application/pdf") {
      return <FileText className="w-5 h-5 text-red-500" />
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return <FileType2 className="w-5 h-5 text-blue-600" />
    } else if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />
    } else if (fileType.includes("powerpoint") || fileType.includes("presentation")) {
      return <Presentation className="w-5 h-5 text-orange-600" />
    } else if (fileType.includes("zip") || fileType.includes("rar")) {
      return <FileArchive className="w-5 h-5 text-yellow-600" />
    } else {
      return <File className="w-5 h-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchContactDetails = async (email: string): Promise<ChatContact> => {
    try {
      const fetchContactResponse = await axios.get(`${API_BASE_URL}/api/user/${encodeURIComponent(email)}`, { withCredentials: true });
      const userData = fetchContactResponse.data as { email: string; name?: string; image: string | null; bio?: string; isOnline?: boolean; lastSeen?: string | Date; found?: boolean }
      return {
        email: userData.email,
        name: userData.name || email.split("@")[0],
        image: userData.image,
        bio: userData.bio || '',
        isOnline: userData.isOnline,
        lastSeen: userData.lastSeen,
        found: userData.found !== undefined ? userData.found : true,
      }
    } catch (error) {
      return {
        email,
        name: email.split("@")[0],
        image: null,
        bio: '',
        isOnline: false,
        lastSeen: undefined,
        found: false,
      }
    }
  }

  const addContactToList = async (email: string) => {
    if (hasAddedContact || !onAddContact) return

    try {
      const contactDetails = await fetchContactDetails(email)
      onAddContact(contactDetails)
      const addContactResponse = await axios.post(`${API_BASE_URL}/api/contacts/add`, { contactEmail: email }, { withCredentials: true });
      setHasAddedContact(true)
    } catch (error) {
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchAndSetContact = () => fetchContactDetails(targetEmail).then(setContact);
    fetchAndSetContact();
    interval = setInterval(fetchAndSetContact, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
    fetchContactDetails(targetEmail).then(setContact)
  }, [targetEmail])

  useEffect(() => {
    const connect = async () => {
      const session = await getSession()
      if (!session?.user?.email) {
        return
      }

      const self = session.user.email
      selfEmailRef.current = self

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        setIsSocketConnected(true)
        // Send join message immediately after connection
        socket.send(JSON.stringify({
          type: "join",
          self: self,
          target: targetEmail
        }))
      }

      socket.onerror = (error) => {
        setIsSocketConnected(false)
      }

      socket.onclose = (event) => {
        setIsSocketConnected(false)
      }

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data)

        if (msg.type === "chat") {
          setMessages((prev) => {
            const isDuplicate = prev.some((m) => {
              if (m.file && msg.file) {
                const timeDiff = Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime())
                const isDuplicateFile = m.file.url === msg.file.url && m.from === msg.from && timeDiff < 2000
                if (isDuplicateFile) return true
              }
              if (m.text && msg.text) {
                const timeDiff = Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime())
                const isDuplicateText = m.text === msg.text && m.from === msg.from && timeDiff < 2000
                if (isDuplicateText) return true
              }
              return false
            })

            if (isDuplicate) {
              return prev
            }

            const newMessages = [...prev, msg]

            if (msg.from !== selfEmailRef.current && msg._id) {
              sendStatusUpdate('delivered', msg._id);
            }

            return newMessages
          })
        }
        if (msg.type === "history") {
          setMessages(msg.messages)
          msg.messages.forEach((m: any) => {
            if (m.from !== selfEmailRef.current && m.status !== 'delivered' && m.status !== 'seen' && m._id) {
              sendStatusUpdate('delivered', m._id);
            }
          });
        }
        if (msg.type === "contact_added") {
          setContactNotification(msg.message)
          setTimeout(() => setContactNotification(null), 3000)
          if (onRefreshContacts) {
            onRefreshContacts()
          }
        }
        if (msg.type === "unknown_message") {
          setContactNotification(`New message from ${msg.fromName || msg.from}`)
          setTimeout(() => setContactNotification(null), 5000)
          if (onUnknownMessage) {
            onUnknownMessage()
          }
        }
        if (msg.type === "status") {
          if (msg.email === targetEmail) {
            setContact(prev => prev ? {
              ...prev,
              isOnline: msg.isOnline,
              lastSeen: msg.lastSeen ? new Date(msg.lastSeen) : prev.lastSeen
            } : prev)
          }
        }
        if (msg.type === "status_update") {
          setMessages((prev) => prev.map((m: any) =>
            m._id === msg.messageId ? { ...m, status: msg.status } : m
          ));
        }
      }
    }

    connect()
    return () => {
      setIsSocketConnected(false)
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [targetEmail, onRefreshContacts, onUnknownMessage])

  // Only auto-scroll if user is near the bottom or sends a message
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 150; // px from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEditClick = (msgId: string, oldText: string) => {
    setEditingId(msgId)
    setEditingText(oldText)
  }

  const handleEditSave = async (msgId: string) => {
    if (!editingText.trim()) return
    try {
      const session = await getSession()
      if (!session?.user?.email) return
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_WS_URL}/messages/` + msgId, { email: session.user.email, text: editingText.trim() }, { withCredentials: true });
      const data = res.data as { data: { text: string } }
      setMessages((prev) => prev.map((m: any) => (m._id === msgId ? { ...m, text: data.data.text } : m)))
      setEditingId(null)
      setEditingText("")
    } catch (err) {
      toast.error("Failed to edit message")
    }
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditingText("")
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      e.target.value = ""
      return
    }
    setPendingFile(file)
    setPendingFilePreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null)
    e.target.value = ""
  }

  const removePendingFile = () => {
    setPendingFile(null)
    setPendingFilePreview(null)
  }

  const handleDeleteMessage = async (msgId: string) => {
    try {
      setDeletingMessageIds((prev) => [...prev, msgId])
      await new Promise((resolve) => setTimeout(resolve, 300)) // Wait for animation
      const session = await getSession()
      if (!session?.user?.email) return
      await axios.delete(`${API_BASE_URL}/api/messages/` + msgId, { headers: { "Content-Type": "application/json" }, data: { email: session.user.email }, withCredentials: true } as any)
      setMessages((prev) => prev.filter((m: any) => m._id !== msgId))
    } catch (err) {
      toast.error("Failed to delete message")
    } finally {
      setDeletingMessageIds((prev) => prev.filter((id) => id !== msgId))
    }
  }

  const handleFileDownload = async (fileUrl: string | undefined, fileName: string) => {
    if (!fileUrl) {
      return
    }

    try {
      let downloadUrl = fileUrl
      if (fileUrl.includes("res.cloudinary.com")) {
        if (fileUrl.includes("/raw/upload/")) {
          downloadUrl = fileUrl.replace("/raw/upload/", "/raw/upload/fl_attachment/")
        } else if (fileUrl.includes("/image/upload/")) {
          downloadUrl = fileUrl.replace("/image/upload/", "/image/upload/fl_attachment/")
        } else if (fileUrl.includes("/upload/")) {
          downloadUrl = fileUrl.replace("/upload/", "/upload/fl_attachment/")
        }
      }

      try {
        const response = await fetch(downloadUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        link.style.display = "none"

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        window.URL.revokeObjectURL(url)
      } catch (fetchError) {
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = fileName
        link.target = "_blank"
        link.rel = "noopener noreferrer"

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      toast.error("Download failed. Please try again or contact support.")
    }
  }

  // Helper function to get proper filename with extension
  function getProperFileName(fileName: string, fileType: string) {
    const hasExtension = fileName.includes(".") && fileName.split(".").pop()!.length <= 4
    if (hasExtension) return fileName
    const mimeToExt: { [key: string]: string } = {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "text/plain": "txt",
      "text/csv": "csv",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "application/zip": "zip",
      "application/x-rar-compressed": "rar",
      "application/json": "json",
      "application/xml": "xml",
      "text/html": "html",
      "text/css": "css",
      "application/javascript": "js",
      "application/typescript": "ts",
    }
    const extension = mimeToExt[fileType]
    if (extension) return `${fileName}.${extension}`
    if (fileType.includes("/")) {
      const subtype = fileType.split("/")[1]
      if (["jpeg", "jpg", "png", "gif", "pdf", "zip", "csv", "json", "xml", "html", "css"].includes(subtype)) {
        return `${fileName}.${subtype === "jpeg" ? "jpg" : subtype}`
      }
    }
    return fileName
  }

  // Send message function (must be above usage)
  const sendMessage = async (text?: string, fileObj?: { url: string; name: string; type: string; size?: number }) => {
    if ((!text || !text.trim()) && !fileObj && !pendingFile) return
    
    // Clear typing indicator
    setIsTyping(false)
    
    // If there is a pending file, upload it first
    if (pendingFile && !fileObj) {
      setIsUploadingFile(true)
      const formData = new FormData()
      formData.append("file", pendingFile)
      try {
        const res = await axios.post(`${API_BASE_URL}/api/upload-file`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        const data = res.data as { url?: string; error?: string; fileName?: string; fileType?: string; fileSize?: number }
        if (data.url) {
          // Send the message with the uploaded file
          sendMessage(text, {
            url: data.url,
            name: data.fileName || pendingFile.name,
            type: data.fileType || pendingFile.type,
            size: data.fileSize || pendingFile.size,
          })
        } else {
          toast.error("File upload failed: " + (data.error || "Unknown error"))
        }
      } catch (error) {
        toast.error("File upload failed. Please try again.")
      } finally {
        setIsUploadingFile(false)
        setPendingFile(null)
        setPendingFilePreview(null)
      }
      return
    }
    const msgObj: ChatMessage = {
      from: selfEmailRef.current || "You",
      text: text?.trim() || "",
    }
    if (fileObj) msgObj.file = fileObj
    const wsMsg: { type: string; text: string; file?: string } = { type: "chat", text: msgObj.text }
    if (msgObj.file) {
      wsMsg.file = JSON.stringify({
        url: msgObj.file.url,
        name: msgObj.file.name,
        type: msgObj.file.type,
        size: msgObj.file.size,
      })
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(wsMsg))
    }
    setMessage("")
    setPendingFile(null)
    setPendingFilePreview(null)
    
    // Scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // Helper for long press and tap (mobile)
  const handleTouchStart = (msgId: string) => {
    if (window.innerWidth >= 768) return; // Only for mobile
    longPressTimeout.current = setTimeout(() => {
      setLongPressedMsgId(msgId);
    }, 500); // 500ms for long press
  };
  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };
  const handleOverlayClose = () => setLongPressedMsgId(null);

  // NEW: Mobile tap handler to show Edit/Delete
  const handleMobileTap = (msgId: string) => {
    if (window.innerWidth < 768) {
      setLongPressedMsgId((prev) => (prev === msgId ? null : msgId));
    }
  };

  // Mobile-specific handlers
  const handleInputFocus = () => {
    setIsInputFocused(true);
    // Scroll to bottom when input is focused
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    setIsTyping(true);
    // Clear typing indicator after 2 seconds of no typing
    setTimeout(() => setIsTyping(false), 2000);
  };

  // Swipe gesture handlers
  const handleTouchStartSwipe = (e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX);
    setSwipeStartY(e.touches[0].clientY);
  };

  const handleTouchMoveSwipe = (e: React.TouchEvent) => {
    if (swipeStartX === null || swipeStartY === null) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = swipeStartX - currentX;
    const diffY = swipeStartY - currentY;
    
    // If horizontal swipe is greater than vertical and significant
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      // Right swipe (show contacts) - only if we're in a chat
      if (diffX < 0 && Math.abs(diffX) > 100) {
        // This could trigger a back action or show contacts
        // For now, we'll just prevent default to avoid conflicts
        e.preventDefault();
      }
    }
  };

  const handleTouchEndSwipe = () => {
    setSwipeStartX(null);
    setSwipeStartY(null);
  };

  // Keyboard event handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(message);
    }
    if (e.key === "Escape") {
      inputRef.current?.blur();
      setShowEmojiPicker(false);
    }
  };

  // Auto-resize input for better mobile experience
  const adjustInputHeight = () => {
    const input = inputRef.current;
    if (input) {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }
  };

  // Handle keyboard visibility on mobile
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function formatLastSeen(lastSeen: string | Date | undefined) {
    if (!lastSeen) return ''
    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return date.toLocaleString()
  }

  // Helper to send delivered/seen events
  const sendStatusUpdate = (type: 'delivered' | 'seen', messageId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, messageId }));
    }
  };

  // Send 'seen' for all messages not from me and not seen when chat is open or messages change
  useEffect(() => {
    messages.forEach((m: any) => {
      if (m.from !== selfEmailRef.current && m.status !== 'seen' && m._id) {
        sendStatusUpdate('seen', m._id);
      }
    });
  }, [messages]);

  // Helper to render ticks
  function renderTicks(status: string) {
    if (status === 'seen') {
      return <span title="Seen"><CheckCheck className="w-4 h-4 text-blue-500 inline align-middle" /></span>;
    }
    if (status === 'delivered') {
      return <span title="Delivered"><CheckCheck className="w-4 h-4 text-gray-400 inline align-middle" /></span>;
    }
    // sent or undefined
    return <span title="Sent"><Check className="w-4 h-4 text-gray-400 inline align-middle" /></span>;
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style={{height: '100dvh', maxHeight: '100dvh', overflow: 'hidden'}}>
      {/* Header */}
      <div className="bg-white/90 backdrop-blur border-b border-white/30 shadow-sm py-3 sm:py-4 flex items-center gap-3 sm:gap-4 sticky top-0 z-10">
        <div className="flex-shrink-0">
          {contact?.image ? (
            <Image
              src={contact.image || "/placeholder.svg"}
              alt={contact.name}
              width={40}
              height={40}
              className="rounded-full object-cover ring-2 ring-blue-200 shadow-md sm:w-12 sm:h-12"
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-semibold text-base sm:text-lg shadow-md">
              {contact ? getInitials(contact.name) : "U"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => setUserInfoOpen(true)}>
          <p className="text-base sm:text-lg font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{contact?.name || targetEmail}</p>
          <p className="text-xs sm:text-sm text-gray-500 truncate group-hover:text-blue-500 transition-colors">{targetEmail}</p>
          <p className="text-xs mt-0.5 sm:mt-1">
            {contact?.isOnline
              ? <span className="text-green-600 font-medium">Online</span>
              : contact?.lastSeen
                ? <span className="text-gray-400">Last seen {formatLastSeen(contact.lastSeen)}</span>
                : <span className="text-gray-400">Offline</span>
            }
          </p>
        </div>
        {/* Mobile back button */}
        <button
          className="md:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          onClick={() => window.history.back()}
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {selectedMsgForAction && (
        <div className="w-full bg-white border-b border-blue-200 flex items-center justify-between px-4 py-2 sticky top-[56px] z-20 shadow animate-fade-in rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700 text-base">Message selected</span>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow transition active:scale-95 disabled:opacity-50"
              onClick={() => {
                if (selectedMsgForAction) handleEditClick(selectedMsgForAction.id, selectedMsgForAction.text);
                setSelectedMsgForAction(null);
              }}
              disabled={!!selectedMsgForAction?.file}
              title={selectedMsgForAction?.file ? 'Cannot edit file messages' : 'Edit message'}
            >
              <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 00-4-4l-8 8v3z" /></svg>Edit</span>
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow transition active:scale-95"
              onClick={() => setShowDeleteModal(true)}
            >
              <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>Delete</span>
            </button>
            <button
              className="ml-2 px-2 py-1 text-gray-500 hover:text-gray-700 rounded border border-gray-200 bg-gray-50 transition"
              onClick={() => setSelectedMsgForAction(null)}
              title="Cancel"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMsgForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Message?</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
                onClick={() => {
                  if (selectedMsgForAction?.id) handleDeleteMessage(selectedMsgForAction.id);
                  setShowDeleteModal(false);
                  setSelectedMsgForAction(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-4 space-y-3 sm:space-y-4 max-h-[calc(100dvh-120px)] min-h-0"
        style={{ 
          paddingBottom: isInputFocused ? '20px' : '10px',
          scrollBehavior: 'smooth',
          maxHeight: 'calc(100dvh - 120px)',
          minHeight: 0
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center mt-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-sm sm:text-base text-gray-500 max-w-sm">Start the conversation by sending a message!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-4 max-w-full sm:mx-3 mx-auto">
            {messages.map((msg, i) => {
              const isOwnMessage = msg.from === selfEmailRef.current
              const isDeleting = deletingMessageIds.includes((msg as any)._id)
              const fileUrl = typeof msg.file === "string" ? msg.file : msg.file?.url
              const fileName = (msg as any).fileName || (typeof msg.file === "object" ? msg.file?.name : undefined) || "File"
              const fileType = (msg as any).fileType || (typeof msg.file === "object" ? msg.file?.type : undefined) || ""
              const fileSize = (msg as any).fileSize || (typeof msg.file === "object" ? msg.file?.size : undefined) || 0
              const downloadFileName = getProperFileName(fileName, fileType)
              const isLongPressed = longPressedMsgId === (msg as any)._id
              return (
                <div
                  key={i}
                  className={`flex w-full flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative group max-w-[85%] sm:max-w-[80%] px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-md break-words transition-all duration-300 ${
                      isOwnMessage
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white ml-auto"
                        : "bg-white text-gray-900 border border-gray-100 mr-auto"
                    } ${isDeleting ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}
                    onTouchStart={isOwnMessage ? () => { handleTouchStart((msg as any)._id); setSelectedMsgForAction({ id: (msg as any)._id, text: msg.text, file: msg.file }); } : undefined}
                    onClick={isOwnMessage ? () => setSelectedMsgForAction({ id: (msg as any)._id, text: msg.text, file: msg.file }) : undefined}
                  >
                    {/* Message content */}
                    {editingId === (msg as any)._id ? (
                      <div className="flex flex-col space-y-2 animate-fade-in bg-blue-50 p-3 rounded-xl shadow-inner">
                        <input
                          type="text"
                          className="w-full border border-blue-400 text-gray-900 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white shadow-sm"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave((msg as any)._id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                          autoFocus
                          placeholder="Edit your message..."
                        />
                        <div className="flex space-x-2 mt-1 justify-end">
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold active:scale-95 transition-transform shadow"
                            onClick={() => handleEditSave((msg as any)._id)}
                          >
                            Save
                          </button>
                          <button
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold active:scale-95 transition-transform shadow"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {fileUrl ? (
                          <div className="mb-2">
                            {fileType && fileType.startsWith("image/") ? (
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={fileUrl || "/placeholder.svg"}
                                  alt={fileName}
                                  className="max-h-40 sm:max-h-48 max-w-full rounded-lg mb-2 shadow-sm border border-gray-200"
                                />
                              </a>
                            ) : (
                              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-w-full">
                                {getFileIcon(fileType)}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
                                </div>
                              </div>
                            )}
                            <a
                              href={fileUrl}
                              className={`inline-flex items-center space-x-1 text-sm font-medium mt-1 ${
                                isOwnMessage ? "text-blue-100 hover:text-white" : "text-blue-600 hover:text-blue-800"
                              }`}
                              download={downloadFileName}
                              onClick={e => {
                                e.preventDefault()
                                handleFileDownload(fileUrl, downloadFileName)
                              }}
                            >
                              <span>📎</span>
                              <span>Download</span>
                            </a>
                          </div>
                        ) : null}
                        {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                      </>
                    )}
                  </div>
                  {/* Timestamp below the bubble */}
                  {msg.createdAt && (
                    <span
                      className={`mt-1 text-xs text-gray-400 select-none ${isOwnMessage ? 'text-right' : 'text-left'}`}
                      style={{ width: '100%' }}
                    >
                      {(() => {
                        const date = new Date(msg.createdAt!);
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </span>
                  )}
                  {isOwnMessage && (
                    <span className="ml-1 align-middle">{renderTicks((msg as any).status)}</span>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white/90 backdrop-blur border-t border-white/30 shadow-lg py-3 sm:py-4 sticky bottom-0 z-40 w-full max-w-full">
        <div className="flex items-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => !isUploadingFile && !pendingFile && fileInputRef.current?.click()}
            className={`p-2.5 sm:p-3 rounded-full transition-all duration-200 ${
              isUploadingFile || pendingFile
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 active:scale-95"
            }`}
            title={isUploadingFile ? "Uploading file..." : pendingFile ? "File selected" : "Attach file"}
            disabled={!isSocketConnected || isUploadingFile || !!pendingFile}
          >
            {isUploadingFile ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={!isSocketConnected || isUploadingFile || !!pendingFile}
            />
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              className="w-full border border-gray-300 text-gray-900 px-4 py-2.5 sm:py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-sm transition-all duration-200 bg-white shadow-sm resize-none"
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={!isSocketConnected || isUploadingFile}
              style={{ minHeight: '44px' }}
            />
          </div>
          
          <button
            onClick={() => sendMessage(message)}
            className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg active:scale-95"
            disabled={!isSocketConnected || (!message.trim() && !pendingFile) || isUploadingFile}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>
        
        {/* Pending file preview below input */}
        {pendingFile && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 mt-3 max-w-lg mx-auto">
            {pendingFilePreview ? (
              <img src={pendingFilePreview} alt={pendingFile.name} className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded" />
            ) : (
              getFileIcon(pendingFile.type)
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(pendingFile.size)}</p>
            </div>
            <button
              type="button"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-700 focus:outline-none active:scale-95 transition-transform"
              title="Remove file"
              aria-label="Remove file"
              onClick={removePendingFile}
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>
      
      <UserInfoBox open={userInfoOpen} onClose={() => setUserInfoOpen(false)} user={{
        name: contact?.name || targetEmail.split('@')[0],
        email: contact?.email || targetEmail,
        image: contact?.image || null,
        bio: contact?.bio || '',
      }} />
    </div>
  )
}
