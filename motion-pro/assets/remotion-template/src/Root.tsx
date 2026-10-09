import React from 'react';
import {Composition} from 'remotion';
import specJson from './spec.json';
import {SpecComposition} from './engine/SpecComposition';

const spec: any = specJson;

// "Main" renders the whole piece. "Layer-<id>" renders one custom layer alone with a
// transparent background, so it can be imported into After Effects as footage.
export const RemotionRoot: React.FC = () => {
  const {width, height, fps, duration} = spec.comp;
  const customs = spec.layers.filter((l: any) => l.type === 'custom');
  return (
    <>
      <Composition id="Main" component={SpecComposition} durationInFrames={duration} fps={fps} width={width} height={height} defaultProps={{only: null}} />
      {customs.map((l: any) => (
        <Composition
          key={l.id}
          id={`Layer-${l.id}`}
          component={SpecComposition}
          durationInFrames={duration}
          fps={fps}
          width={width}
          height={height}
          defaultProps={{only: l.id}}
        />
      ))}
    </>
  );
};
