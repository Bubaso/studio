'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';

interface CustomAudioPlayerProps {
  audioUrl: string;
  variant?: 'sent' | 'received';
}

export function CustomAudioPlayer({ audioUrl, variant = 'received' }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    const onEnd = () => setIsPlaying(false);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnd);
    
    // Sometimes loadeddata doesn't fire for cached audio
    if(audio.readyState > 0 && audio.duration !== Infinity) {
      setDuration(audio.duration);
    }


    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);
  
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => console.error("Audio play failed:", error));
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time <= 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleSliderChange = (value: number[]) => {
    const audio = audioRef.current;
    if(audio) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const playerClasses = {
    sent: {
      button: 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground',
      sliderTrack: 'bg-primary-foreground/30',
      sliderRange: 'bg-primary-foreground',
      sliderThumb: 'bg-primary-foreground border-primary-foreground',
      text: 'text-primary-foreground/80',
    },
    received: {
      button: 'bg-gray-200 hover:bg-gray-300 text-foreground',
      sliderTrack: 'bg-muted-foreground/30',
      sliderRange: 'bg-primary',
      sliderThumb: 'border-primary bg-primary',
      text: 'text-muted-foreground',
    },
  };
  
  const classes = playerClasses[variant];
  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(duration);

  return (
    <div className="flex items-center gap-3 w-full max-w-xs">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 flex-shrink-0 rounded-full', classes.button)}
        onClick={togglePlayPause}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
      </Button>
      <Slider
        value={[currentTime]}
        max={duration || 1}
        step={0.1}
        onValueChange={handleSliderChange}
        className="w-full flex-grow"
        classNames={{
          track: cn('h-1', classes.sliderTrack),
          range: cn('h-1', classes.sliderRange),
          thumb: cn('h-3 w-3', classes.sliderThumb),
        }}
      />
      <span className={cn('text-xs min-w-[35px] text-right font-mono', classes.text)}>
        {displayTime}
      </span>
    </div>
  );
}
