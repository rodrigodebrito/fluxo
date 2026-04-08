import PromptNode from "./PromptNode";
import ImageInputNode from "./ImageInputNode";
import ModelNode from "./ModelNode";
import OutputNode from "./OutputNode";
import KlingElementNode from "./KlingElementNode";
import LastFrameNode from "./LastFrameNode";
import VideoConcatNode from "./VideoConcatNode";
import AnyLLMNode from "./AnyLLMNode";
import RouterNode from "./RouterNode";
import PromptConcatNode from "./PromptConcatNode";
import TextIteratorNode from "./TextIteratorNode";
import VideoInputNode from "./VideoInputNode";
import AudioInputNode from "./AudioInputNode";
import GroupNode from "./GroupNode";

export const nodeTypes = {
  prompt: PromptNode,
  imageInput: ImageInputNode,
  model: ModelNode,
  output: OutputNode,
  klingElement: KlingElementNode,
  lastFrame: LastFrameNode,
  videoConcat: VideoConcatNode,
  anyLLM: AnyLLMNode,
  router: RouterNode,
  promptConcat: PromptConcatNode,
  textIterator: TextIteratorNode,
  videoInput: VideoInputNode,
  audioInput: AudioInputNode,
  group: GroupNode,
};
