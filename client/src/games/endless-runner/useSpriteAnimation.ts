import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface SpriteAnimationConfig {
  basePath: string;
  frameCount: number;
  framePrefix?: string;
  framePadding?: number;
  fps?: number;
}

export function useSpriteAnimation(config: SpriteAnimationConfig) {
  const { basePath, frameCount, framePrefix = '', framePadding = 4, fps = 24 } = config;
  const [textures, setTextures] = useState<THREE.Texture[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const frameIndexRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const frameInterval = 1000 / fps;

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const loadPromises: Promise<THREE.Texture>[] = [];

    for (let i = 0; i < frameCount; i++) {
      const frameNum = framePrefix 
        ? String(i + 1).padStart(framePadding, '0')
        : String(i).padStart(framePadding, '0');
      const path = `${basePath}/${frameNum}.png`;
      
      loadPromises.push(
        new Promise((resolve, reject) => {
          loader.load(
            path,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              resolve(texture);
            },
            undefined,
            reject
          );
        })
      );
    }

    Promise.all(loadPromises)
      .then((loadedTextures) => {
        setTextures(loadedTextures);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load sprite textures:', err);
      });

    return () => {
      textures.forEach((tex) => tex.dispose());
    };
  }, [basePath, frameCount, framePrefix, framePadding]);

  const getCurrentTexture = (time: number): THREE.Texture | null => {
    if (!isLoaded || textures.length === 0) return null;

    if (time - lastFrameTimeRef.current >= frameInterval) {
      frameIndexRef.current = (frameIndexRef.current + 1) % textures.length;
      lastFrameTimeRef.current = time;
    }

    return textures[frameIndexRef.current];
  };

  const resetAnimation = () => {
    frameIndexRef.current = 0;
    lastFrameTimeRef.current = 0;
  };

  return { textures, isLoaded, getCurrentTexture, resetAnimation, frameIndex: frameIndexRef };
}

export function usePreloadedTextures(paths: string[]): { textures: Map<string, THREE.Texture>; isLoaded: boolean } {
  const [textures, setTextures] = useState<Map<string, THREE.Texture>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const loadPromises = paths.map((path) =>
      new Promise<[string, THREE.Texture]>((resolve, reject) => {
        loader.load(
          path,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            resolve([path, texture]);
          },
          undefined,
          reject
        );
      })
    );

    Promise.all(loadPromises)
      .then((results) => {
        const map = new Map<string, THREE.Texture>();
        results.forEach(([path, tex]) => map.set(path, tex));
        setTextures(map);
        setIsLoaded(true);
      })
      .catch((err) => console.error('Failed to preload textures:', err));

    return () => {
      textures.forEach((tex) => tex.dispose());
    };
  }, []);

  return { textures, isLoaded };
}
