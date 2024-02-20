import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';
import { Field } from 'datocms-plugin-sdk';

type PropTypes = {
  ctx: RenderItemFormSidebarPanelCtx;
};

export default function ParentSelection({ ctx }: PropTypes) {
  return (
    <Canvas ctx={ctx}>
        <h2>Parent entry</h2>
    </Canvas>
  );
}