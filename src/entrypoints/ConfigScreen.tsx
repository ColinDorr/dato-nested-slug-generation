import { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import { Canvas, ContextInspector } from 'datocms-react-ui';

type Props = {
  ctx: RenderConfigScreenCtx;
};

export default function ConfigScreen({ ctx }: Props) {
  return (
    <Canvas ctx={ctx}>
      <div>
        <h2>How to use</h2>
        <ol>
          <li>Add the plugin to the desired slug field.</li>
          <li>Go to the presentations tab and select the plugin as presentation option.</li>
          <li>Go to the "validations" tab and disabled the pattern matching option. Otherwise the plugin won't be update your slug.</li>
        </ol>
      </div>

      <div>
        <h2>Options</h2>
        <ContextInspector />
      </div>
    </Canvas>
  );
}
