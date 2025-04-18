"use client"

import {Button} from "@/components/ui/button";
import React,{useEffect} from "react";
import {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Conversation} from "@11labs/client";
import {cn} from "@/lib/utils";
import {AGENT_PROMPTS} from "@/lib/prompts";

import { getHistory, getHistoryId, sessionId } from "@/app/services/users";

async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({audio: true})
        return true
    } catch {
        console.error('Microphone permission denied')
        return false
    }
}


async function getSignedUrl(): Promise<string> {
    const response = await fetch('/api/signed-url')
    if (!response.ok) {
        throw Error('Failed to get signed url')
    }
    const data = await response.json()
    return data.signedUrl
}

export default function ConvAI() {
    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const fetchHistoryId=async()=>{
        try{
        const ids:any= await getHistoryId()
        console.log(ids,"ids")
        await getHistory(ids?.[0]?.session_id)
        }catch(err){
            console.log(err)
        }
    }
    useEffect(()=>{
        fetchHistoryId()
    },[])
    async function startConversation() {
      
        const hasPermission = await requestMicrophonePermission()
        if (!hasPermission) {
            alert("No permission")
            return;
        }
        
        const userId = localStorage.getItem("id")
        const signedUrl = await getSignedUrl()
        console.log(signedUrl,"signedUrl")
        // await sessionId({session_id:})
        console.log(AGENT_PROMPTS.default.replace('{userId}', userId || 'unknown'))
        const conversation = await Conversation.startSession({
            signedUrl: signedUrl,
            overrides: {
                agent: {
                    prompt: {
                        prompt: AGENT_PROMPTS.default.replace('{userId}', userId || 'unknown')
                    }
                }
            },
            onConnect: () => {
                setIsConnected(true)
                setIsSpeaking(true)
            },
            onDisconnect: () => {
                setIsConnected(false)
                setIsSpeaking(false)
            },
            onError: (error) => {
                console.log(error)
                alert('An error occurred during the conversation')
            },
            onModeChange: ({mode}) => {
                setIsSpeaking(mode === 'speaking')
            },
        })
        const id = conversation.getId();
      
        setConversation(conversation)
      await sessionId({session_id:id})
    }

    async function endConversation() {
        if (!conversation) {
            return
        }
        await conversation.endSession()
        setConversation(null)
    }

    return (
        <div className={"flex justify-center items-center gap-x-4"}>
            <Card className={'rounded-3xl'}>
                <CardContent>
                    <CardHeader>
                        <CardTitle className={'text-center'}>
                            {isConnected ? (
                                isSpeaking ? `Agent is speaking` : 'Agent is listening'
                            ) : (
                                'Disconnected'
                            )}
                        </CardTitle>
                    </CardHeader>
                    <div className={'flex flex-col gap-y-4 text-center'}>
                        <div className={cn('orb my-16 mx-12',
                            isSpeaking ? 'animate-orb' : (conversation && 'animate-orb-slow'),
                            isConnected ? 'orb-active' : 'orb-inactive')}
                        ></div>


                        <Button
                            variant={'outline'}
                            className={'rounded-full'}
                            size={"lg"}
                            disabled={conversation !== null && isConnected}
                            onClick={startConversation}
                        >
                            Start conversation
                        </Button>
                        <Button
                            variant={'outline'}
                            className={'rounded-full'}
                            size={"lg"}
                            disabled={conversation === null && !isConnected}
                            onClick={endConversation}
                        >
                            End conversation
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}