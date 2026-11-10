import React from 'react';
import { Composition, Still } from 'remotion';
import { Thumbnail } from './Thumbnail';
import { Episode } from './Episode';
import EP from './data/episode.json';

export const FPS = 30;
export const Root: React.FC = () => (
  <>
    <Composition id="Episode" component={Episode} width={1920} height={1080} fps={FPS} durationInFrames={Math.ceil(EP.duration * FPS)} />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
  </>
);
