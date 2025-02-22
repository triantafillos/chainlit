import { PlaygroundContext } from 'contexts/PlaygroundContext';
import { EditorState } from 'draft-js';
import { Fragment, forwardRef, useContext } from 'react';
import { grey } from 'theme';

import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { IPrompt } from 'client-types/';

import Completion from './editor/completion';
import PromptMessage from './editor/promptMessage';

interface Props {
  prompt: IPrompt;
  hasTemplate: boolean;
  restoredTime: number;
}

export const ChatPromptPlayground = forwardRef(
  ({ hasTemplate, prompt, restoredTime }: Props, ref) => {
    const { promptMode, setPlayground } = useContext(PlaygroundContext);

    const messages = prompt.messages;

    const onChange = (index: number, nextState: EditorState) => {
      const text = nextState.getCurrentContent().getPlainText();
      const key = hasTemplate ? 'template' : 'formatted';

      setPlayground((old) => ({
        ...old,
        prompt: {
          ...old!.prompt!,
          messages: old?.prompt?.messages?.map((message, mIndex) => {
            if (mIndex === index) {
              return {
                ...message,
                [key]: text
              };
            }
            return message;
          })
        }
      }));
    };

    const title =
      promptMode === 'Formatted'
        ? hasTemplate
          ? 'Formatted messages [Read Only]'
          : 'Formatted messages'
        : 'Prompt messages';

    return (
      <Stack sx={{ width: '100%' }}>
        <Typography fontSize="14px" fontWeight={700} color={grey[400]}>
          {title}
        </Typography>
        <Box
          key={restoredTime} // This will re-mount the component with restored messages
          ref={ref}
          sx={{
            flex: 1,
            height: 'auto',
            overflow: 'auto',
            scrollbarGutter: 'stable',
            marginTop: 1,
            gap: 1
          }}
        >
          {messages?.length ? (
            <Stack>
              {messages.map((message, index) => (
                <Fragment key={`prompt-message-${index}`}>
                  <PromptMessage
                    message={message}
                    prompt={prompt}
                    mode={promptMode}
                    index={index}
                    onChange={onChange}
                  />
                </Fragment>
              ))}
            </Stack>
          ) : null}
          <Box color="text.secondary" pl={2} py={2}>
            <Button
              onClick={() => {
                setPlayground((old) => ({
                  ...old,
                  prompt: {
                    ...old!.prompt!,
                    messages: [
                      ...old!.prompt!.messages!,
                      {
                        role: 'assistant',
                        template: '',
                        formatted: '',
                        template_format: old!.prompt!.template_format
                      }
                    ]
                  }
                }));
              }}
              color="inherit"
              sx={{ fontWeight: 700, textTransform: 'capitalize' }}
              startIcon={<AddCircleOutlined />}
            >
              Add Message
            </Button>
          </Box>
          <Completion completion={prompt.completion} chatMode />
        </Box>
      </Stack>
    );
  }
);

export default ChatPromptPlayground;
