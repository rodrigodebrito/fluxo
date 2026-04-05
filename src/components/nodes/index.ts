import PromptNode from "./PromptNode";
import ImageInputNode from "./ImageInputNode";
import ModelNode from "./ModelNode";
import OutputNode from "./OutputNode";
import KlingElementNode from "./KlingElementNode";
import LastFrameNode from "./LastFrameNode";
import VideoConcatNode from "./VideoConcatNode";

export const nodeTypes = {
  prompt: PromptNode,
  imageInput: ImageInputNode,
  model: ModelNode,
  output: OutputNode,
  klingElement: KlingElementNode,
  lastFrame: LastFrameNode,
  videoConcat: VideoConcatNode,
};
